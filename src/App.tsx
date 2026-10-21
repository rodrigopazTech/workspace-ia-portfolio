/**
 * Workspace AI Copilot - Conversational AI Chatbot for Google Workspace
 * Integrates Google Drive, Google Calendar, Gmail, Google Tasks, Google Docs, Sheets, Slides, Contacts & Keep.
 * Supports Decoupled Basic Google Sign-In, Interactive Demo Mode, and Incremental App Permissions.
 */
import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  initAuth,
  basicGoogleSignIn,
  enterDemoMode,
  logout,
  getAccessToken,
  isDemoModeActive,
  setDemoModeActive,
} from './services/auth';
import { SignInScreen } from './components/SignInScreen';
import { Header } from './components/Header';
import { ChatView } from './components/ChatView';
import { WorkspaceDashboard } from './components/WorkspaceDashboard';
import { KeepNotesView } from './components/KeepNotesView';
import { WorkspacePermissionsModal } from './components/WorkspacePermissionsModal';
import { TestUserRequestModal } from './components/TestUserRequestModal';
import {
  ChatMessage,
  WorkspaceAppType,
  ChatAttachment,
  WorkspaceMentionItem,
} from './types/workspace';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'chat' | 'dashboard' | 'keep'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);

  // Modals state
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [isTestUserModalOpen, setIsTestUserModalOpen] = useState(false);

  // Initialize auth listener on mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (authedUser, token, isDemo) => {
        setUser(authedUser);
        setAccessToken(token || 'demo-token');
        setIsDemoMode(Boolean(isDemo || !token));
        setIsInitializing(false);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setIsDemoMode(false);
        setIsInitializing(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const result = await basicGoogleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken || 'demo-token');
        setIsDemoMode(result.isDemo);
      }
    } catch (err: any) {
      console.error('Sign-in failure:', err);
      setLoginError(
        err.message || 'Google Sign-in failed. Please verify popup blockers and try again.'
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleEnterDemo = () => {
    const demo = enterDemoMode();
    setUser(demo.user);
    setAccessToken(demo.accessToken);
    setIsDemoMode(true);
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    setIsDemoMode(false);
    setMessages([]);
    setActiveTab('chat');
  };

  const handleSendMessage = async (
    text: string,
    appScope?: WorkspaceAppType,
    attachments?: ChatAttachment[],
    mentions?: WorkspaceMentionItem[]
  ) => {
    const hasAttachments = attachments && attachments.length > 0;
    const hasMentions = mentions && mentions.length > 0;
    if ((!text.trim() && !hasAttachments && !hasMentions) || isLoadingChat) return;

    let token = accessToken;
    if (!token && !isDemoMode) {
      token = await getAccessToken();
      if (!token) {
        token = 'demo-token';
        setIsDemoMode(true);
      }
      setAccessToken(token);
    }

    // Add user message to state
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content:
        text.trim() ||
        (hasAttachments
          ? 'Analiza el archivo/imagen adjunto.'
          : hasMentions
          ? 'Analiza los recursos mencionados de Workspace.'
          : ''),
      timestamp: Date.now(),
      attachments: hasAttachments ? attachments : undefined,
      mentions: hasMentions ? mentions : undefined,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoadingChat(true);

    try {
      // Prepare payload for backend Gemini API
      let promptContent = userMessage.content;
      if (appScope && appScope !== 'all') {
        const appNames: Record<WorkspaceAppType, string> = {
          all: 'Google Workspace',
          gmail: 'Gmail',
          calendar: 'Google Calendar',
          drive: 'Google Drive',
          tasks: 'Google Tasks',
          keep: 'Google Keep & Notas',
          sheets: 'Google Sheets',
          docs: 'Google Docs',
          slides: 'Google Slides',
          contacts: 'Google Contacts',
          forms: 'Google Forms',
          meet: 'Google Meet',
        };
        promptContent = `[Focus exclusively on ${appNames[appScope]}]: ${userMessage.content}`;
      }

      // Convert messages to history payload including attachments and mentions
      const chatPayload = {
        messages: newMessages.map((m, idx) => ({
          role: m.role,
          content: idx === newMessages.length - 1 ? promptContent : m.content,
          attachments: m.attachments,
          mentions: m.mentions,
        })),
        accessToken: token || 'demo-token',
        isDemo: isDemoMode,
        userContext: {
          displayName: user?.displayName || undefined,
          email: user?.email || undefined,
          currentTime: new Date().toISOString(),
        },
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || 'demo-token'}`,
        },
        body: JSON.stringify(chatPayload),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        if (response.status === 401) {
          throw new Error('Access token has expired. Please sign in or switch to Demo Mode.');
        }
        throw new Error(errJson.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.text || 'He consultado la suite de Google Workspace.',
        timestamp: Date.now(),
        toolInvocations: data.toolInvocations,
        workspaceCards: data.workspaceCards,
        validation: data.validation,
        modelInfo: data.modelInfo,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **No fue posible completar la consulta con Google Workspace**: ${
          err.message || 'Ocurrió un error inesperado.'
        }\n\nPuedes probar en **Modo Demo** o solicitar ser agregado como Test User en el buzón.`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoadingChat(false);
    }
  };

  const handleAskFromDashboard = (prompt: string) => {
    setActiveTab('chat');
    handleSendMessage(prompt);
  };

  // Initial loading state
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Iniciando Workspace Copilot...</p>
        </div>
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return (
      <SignInScreen
        onSignIn={handleSignIn}
        onEnterDemo={handleEnterDemo}
        isLoading={isLoggingIn}
        error={loginError}
      />
    );
  }

  // Signed in / Demo App
  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col">
      <Header
        user={user}
        isDemoMode={isDemoMode}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        onOpenPermissionsModal={() => setIsPermissionsModalOpen(true)}
        onOpenTestUserModal={() => setIsTestUserModalOpen(true)}
      />

      <main className="flex-1">
        {activeTab === 'chat' ? (
          <ChatView
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoadingChat}
            onClearChat={() => setMessages([])}
            userDisplayName={user.displayName?.split(' ')[0] || user.email?.split('@')[0]}
            accessToken={accessToken || 'demo-token'}
            isDemoMode={isDemoMode}
            onOpenPermissionsModal={() => setIsPermissionsModalOpen(true)}
            onOpenTestUserModal={() => setIsTestUserModalOpen(true)}
          />
        ) : activeTab === 'dashboard' ? (
          <WorkspaceDashboard
            accessToken={accessToken || 'demo-token'}
            onAskCopilot={handleAskFromDashboard}
          />
        ) : (
          <KeepNotesView
            accessToken={accessToken || 'demo-token'}
            userId={user.uid}
            onAskCopilot={handleAskFromDashboard}
          />
        )}
      </main>

      {/* Permissions Modal */}
      <WorkspacePermissionsModal
        isOpen={isPermissionsModalOpen}
        onClose={() => setIsPermissionsModalOpen(false)}
        onOpenTestUserModal={() => {
          setIsPermissionsModalOpen(false);
          setIsTestUserModalOpen(true);
        }}
        userEmail={user.email || undefined}
        onPermissionsUpdated={() => {
          setIsDemoMode(isDemoModeActive());
        }}
      />

      {/* Test Users Mailbox Modal */}
      <TestUserRequestModal
        isOpen={isTestUserModalOpen}
        onClose={() => setIsTestUserModalOpen(false)}
        defaultEmail={user.email || ''}
        defaultName={user.displayName || ''}
      />
    </div>
  );
}
