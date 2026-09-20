import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Send, Bot, User as UserIcon, ShieldAlert, Wind, Calendar, HeartPulse, ArrowLeft } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { EmergencyNoticeBanner } from '../components/EmergencyNoticeBanner';
import { apiRequest } from '../api/config';
import { ChatMessage } from '../types';

interface ChatBotScreenProps {
  onTriggerSOS: () => void;
  onNavigateToCoping: () => void;
  onNavigateToCounsellors: () => void;
  onNavigateHome?: () => void;
}

export const ChatBotScreen: React.FC<ChatBotScreenProps> = ({
  onTriggerSOS,
  onNavigateToCoping,
  onNavigateToCounsellors,
  onNavigateHome,
}) => {
  const { user, caseId, victimPseudoId } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'bot',
      text: `Hello ${user?.name || 'there'}. I am your confidential RESQ-MIND AI support companion. I am powered by our on-device GPU distress model to listen without judgment. How are you feeling right now?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || loading) return;

    const userText = inputText.trim();
    setInputText('');

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await apiRequest('/chat/message', {
        method: 'POST',
        body: JSON.stringify({
          victim_pseudo_id: victimPseudoId || 'VIC-PSEUDO-USER',
          case_id: caseId || 'CASE-MH-2026-001',
          message: userText,
          language: 'en',
        }),
      });

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        detected_crisis: response.detected_crisis,
        emergency_pathway_suggested: response.emergency_pathway_suggested,
        suggested_coping_exercise: response.suggested_coping_exercise,
        prompt_counsellor_booking: response.prompt_counsellor_booking,
        trigger_point3_sos: response.trigger_point3_sos,
        somatic_alert: response.somatic_alert,
      };

      setMessages((prev) => [...prev, botMsg]);

      // Requirement #3 / Point 3: If AI Chat bot senses suicide or acute danger, trigger Point 3 SOS immediately!
      if (response.trigger_point3_sos || response.detected_crisis) {
        onTriggerSOS();
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `bot-err-${Date.now()}`,
        sender: 'bot',
        text: 'I am temporarily having trouble reaching the inference engine, but please remember: you are safe here. If you need urgent support, call 14416 or 112 immediately.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.botRow]}>
        {!isUser && (
          <View style={styles.botAvatar}>
            <Bot size={18} color="#FFFFFF" />
          </View>
        )}

        <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userText : styles.botText]}>
            {item.text}
          </Text>

          {/* Point 3 Automatic Crisis Trigger Banner inside message */}
          {item.trigger_point3_sos && (
            <TouchableOpacity style={styles.crisisSosTriggerBtn} onPress={onTriggerSOS}>
              <ShieldAlert size={16} color="#FFFFFF" />
              <Text style={styles.crisisSosTriggerText}>
                EMERGENCY ALERT: Triggering Point 3 Call to Contact 1 & SMS
              </Text>
            </TouchableOpacity>
          )}

          {/* Somatic / Serotonin Alert Banner */}
          {item.somatic_alert && (
            <View style={styles.somaticInChatMessage}>
              <HeartPulse size={14} color="#059669" />
              <Text style={styles.somaticInChatText}>
                Somatic indicator: Serotonin & nutritional support recommended. Log your weight check-in.
              </Text>
            </View>
          )}

          {/* Suggested Coping Action Button */}
          {item.suggested_coping_exercise === 'box_breathing' && (
            <TouchableOpacity style={styles.actionChip} onPress={onNavigateToCoping}>
              <Wind size={14} color="#D97706" />
              <Text style={styles.actionChipText}>Start Guided Box Breathing Now</Text>
            </TouchableOpacity>
          )}

          {/* Suggested Counsellor Appointment Booking */}
          {item.prompt_counsellor_booking && (
            <TouchableOpacity style={[styles.actionChip, { borderColor: '#BFDBFE', backgroundColor: '#EFF6FF' }]} onPress={onNavigateToCounsellors}>
              <Calendar size={14} color="#2563EB" />
              <Text style={[styles.actionChipText, { color: '#1E40AF' }]}>
                Book Confidential Session with Counsellor
              </Text>
            </TouchableOpacity>
          )}

          <Text style={[styles.timeText, isUser ? styles.userTime : styles.botTime]}>
            {item.timestamp}
          </Text>
        </View>

        {isUser && (
          <View style={styles.userAvatar}>
            <UserIcon size={18} color="#4F46E5" />
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <EmergencyNoticeBanner />

      {/* Chat header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {onNavigateHome && (
            <TouchableOpacity
              style={{ marginRight: 10, padding: 4 }}
              onPress={onNavigateHome}
              activeOpacity={0.7}
            >
              <ArrowLeft size={20} color="#4F46E5" />
            </TouchableOpacity>
          )}
          <View style={styles.activeDot} />
          <View>
            <Text style={styles.headerTitle}>RESQ-MIND AI Companion</Text>
            <Text style={styles.headerSubtitle}>Multilingual Sentiment & Safety Active</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.quickSosBtn} onPress={onTriggerSOS}>
          <ShieldAlert size={14} color="#FFFFFF" />
          <Text style={styles.quickSosText}>SOS</Text>
        </TouchableOpacity>
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.listContent}
      />

      {/* Input row */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Share your thoughts or feelings safely..."
          placeholderTextColor="#9CA3AF"
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!inputText.trim() || loading) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || loading}
        >
          {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Send size={18} color="#FFFFFF" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  headerTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  quickSosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  quickSosText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 14,
    alignItems: 'flex-end',
    gap: 8,
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  botRow: {
    justifyContent: 'flex-start',
  },
  botAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#4F46E5',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  messageText: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  userText: {
    color: '#FFFFFF',
  },
  botText: {
    color: '#1E293B',
  },
  timeText: {
    fontSize: 9.5,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  userTime: {
    color: '#C7D2FE',
  },
  botTime: {
    color: '#94A3B8',
  },
  crisisSosTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
  crisisSosTriggerText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    flex: 1,
  },
  somaticInChatMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  somaticInChatText: {
    color: '#065F46',
    fontSize: 11,
    flex: 1,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
  actionChipText: {
    color: '#92400E',
    fontSize: 11.5,
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 8,
  },
  input: {
    flex: 1,
    maxHeight: 90,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13.5,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
});
