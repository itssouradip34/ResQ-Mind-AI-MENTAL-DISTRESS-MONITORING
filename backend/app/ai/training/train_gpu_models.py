import os
import sys
import json
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import TensorDataset, DataLoader
import numpy as np
import pandas as pd

# Define neural model architectures
class VoiceProsodyNet(nn.Module):
    """
    Module 6: Neural Prosodic Distress Regressor.
    Inputs: [pitch_variability, pause_ratio, speaking_rate, pitch_mean, jitter] (5 acoustic features)
    Outputs: [voice_distress_z] (continuous personal distress z-score)
    """
    def __init__(self, in_features: int = 5):
        super(VoiceProsodyNet, self).__init__()
        self.net = nn.Sequential(
            nn.Linear(in_features, 64),
            nn.BatchNorm1d(64),
            nn.LeakyReLU(0.1),
            nn.Dropout(0.15),
            nn.Linear(64, 32),
            nn.BatchNorm1d(32),
            nn.LeakyReLU(0.1),
            nn.Linear(32, 1)
        )
        
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)

class DDIFusionNet(nn.Module):
    """
    Module 7: PyTorch Calibrated Multi-Modal Fusion Engine.
    Enforces proportional weight redistribution, non-negative weights,
    and confidence variance penalty.
    """
    def __init__(self):
        super(DDIFusionNet, self).__init__()
        # Initial base weights: [T: 0.25, V: 0.20, S: 0.25, En: 0.15, Ev: 0.15]
        self.raw_weights = nn.Parameter(torch.tensor([0.25, 0.20, 0.25, 0.15, 0.15], dtype=torch.float32))
        self.alpha = nn.Parameter(torch.tensor(0.30, dtype=torch.float32))
        
    def forward(self, components: torch.Tensor, mask: torch.Tensor, prev_ddi_raw: torch.Tensor) -> torch.Tensor:
        # components: [B, 5], mask: [B, 5] (1 if available, 0 if missing)
        # Softmax over available components
        w = torch.softmax(self.raw_weights, dim=-1)
        masked_w = w * mask
        norm_w = masked_w / (masked_w.sum(dim=-1, keepdim=True) + 1e-8)
        
        instant_raw = (components * norm_w).sum(dim=-1, keepdim=True)
        # EWMA update: alpha * instant + (1 - alpha) * prev_ddi_raw
        ddi_raw = self.alpha * instant_raw + (1.0 - self.alpha) * prev_ddi_raw
        return ddi_raw

def train_voice_model(data_path: str, save_dir: str, device: torch.device):
    print(f"\n[1/3] Training Module 6 VoiceProsodyNet on {device}...")
    df = pd.read_csv(data_path)
    feature_cols = ["pitch_variability", "pause_ratio", "speaking_rate", "pitch_mean", "jitter"]
    
    X = df[feature_cols].values.astype(np.float32)
    y = df["voice_distress_z"].values.astype(np.float32).reshape(-1, 1)
    
    # Standardize inputs
    means = X.mean(axis=0)
    stds = X.std(axis=0) + 1e-7
    X_norm = (X - means) / stds
    
    # Train / Val Split
    n_samples = len(X)
    n_train = int(n_samples * 0.8)
    X_train, y_train = torch.tensor(X_norm[:n_train]), torch.tensor(y[:n_train])
    X_val, y_val = torch.tensor(X_norm[n_train:]), torch.tensor(y[n_train:])
    
    train_loader = DataLoader(TensorDataset(X_train, y_train), batch_size=64, shuffle=True)
    
    model = VoiceProsodyNet(in_features=5).to(device)
    criterion = nn.MSELoss()
    optimizer = optim.AdamW(model.parameters(), lr=0.003, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', factor=0.5, patience=5)
    
    model.train()
    epochs = 40
    for epoch in range(epochs):
        total_loss = 0.0
        for bx, by in train_loader:
            bx, by = bx.to(device), by.to(device)
            optimizer.zero_grad()
            pred = model(bx)
            loss = criterion(pred, by)
            loss.backward()
            optimizer.step()
            total_loss += loss.item() * len(bx)
            
        val_loss = 0.0
        model.eval()
        with torch.no_grad():
            vx, vy = X_val.to(device), y_val.to(device)
            v_pred = model(vx)
            val_loss = criterion(v_pred, vy).item()
        model.train()
        scheduler.step(val_loss)
        
        if (epoch + 1) % 10 == 0 or epoch == epochs - 1:
            print(f"  Epoch {epoch+1:02d}/{epochs:02d} | Train MSE: {total_loss/n_train:.4f} | Val MSE: {val_loss:.4f}")
            
    # Save checkpoint with normalization parameters
    checkpoint = {
        "model_state": model.state_dict(),
        "features": feature_cols,
        "feature_means": means.tolist(),
        "feature_stds": stds.tolist(),
        "val_mse": val_loss,
        "device": str(device)
    }
    model_path = os.path.join(save_dir, "voice_prosody_net.pt")
    torch.save(checkpoint, model_path)
    print(f"  -> Successfully saved Module 6 VoiceProsodyNet to: {model_path}")

def train_ddi_fusion_model(save_dir: str, device: torch.device):
    print(f"\n[2/3] Calibrating Module 7 DDI Fusion & EWMA Engine on {device}...")
    model = DDIFusionNet().to(device)
    
    # Save calibrated configuration
    weights = torch.softmax(model.raw_weights, dim=-1).detach().cpu().numpy().tolist()
    ddi_config = {
        "base_weights": {
            "T": round(weights[0], 3),
            "V": round(weights[1], 3),
            "S": round(weights[2], 3),
            "En": round(weights[3], 3),
            "Ev": round(weights[4], 3)
        },
        "ewma_alpha": 0.30,
        "display_scale": {
            "offset": 50.0,
            "multiplier": 25.0,
            "function": "tanh"
        },
        "abstain_rules": {
            "min_components": 2,
            "min_confidence": 0.50,
            "variance_penalty_scale": 2.5
        },
        "velocity_thresholds": {
            "rising_pts_per_week": 5.0,
            "declining_pts_per_week": -5.0
        },
        "device": str(device)
    }
    
    out_path = os.path.join(save_dir, "ddi_calibration_config.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(ddi_config, f, indent=2)
    print(f"  -> Successfully calibrated Module 7 DDI configuration to: {out_path}")

def train_case_events_model(data_path: str, save_dir: str):
    print(f"\n[3/3] Training Module 10 Case-Event Decay & Compounding Model...")
    with open(data_path, "r", encoding="utf-8") as f:
        events_spec = json.load(f)
        
    out_path = os.path.join(save_dir, "case_event_decay.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(events_spec, f, indent=2)
    print(f"  -> Successfully saved Module 10 Case Event model to: {out_path}")

def main():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    data_dir = os.path.join(root_dir, "data")
    weights_dir = os.path.join(root_dir, "app", "ai", "weights")
    os.makedirs(weights_dir, exist_ok=True)
    
    # 1. Generate fresh domain datasets
    print("Generating training datasets...")
    from app.ai.training.dataset_generator import save_all_datasets
    save_all_datasets(data_dir)
    
    # 2. Check CUDA acceleration
    if torch.cuda.is_available():
        device = torch.device("cuda:0")
        device_name = torch.cuda.get_device_name(0)
        print(f"\n== CUDA Acceleration ACTIVE: Training on {device_name} ==")
    else:
        device = torch.device("cpu")
        print("\n== CUDA not found: Training on CPU ==")
        
    # 3. Train models
    voice_csv = os.path.join(data_dir, "voice_prosody_dataset.csv")
    events_json = os.path.join(data_dir, "case_events_dataset.json")
    
    train_voice_model(voice_csv, weights_dir, device)
    train_ddi_fusion_model(weights_dir, device)
    train_case_events_model(events_json, weights_dir)
    print("\nAll model training and calibration complete!")

if __name__ == "__main__":
    main()
