import {ReactElement} from "react";
import {StageBase, StageResponse, InitialData, Message} from "@chub-ai/stages-ts";
import {LoadResponse} from "@chub-ai/stages-ts/dist/types/load";

// Define our state types
type InitStateType = {
  totalXP: number;
  currentLevel: number;
  isNSFWUnlocked: boolean;
};

type MessageStateType = {
  previousXP: number;
  previousLevel: number;
  lastChange: number;
  lastInteractionType: 'positive' | 'negative' | 'neutral';
};

type ChatStateType = {
  interactionHistory: Array<{
    message: string;
    scoreChange: number;
    timestamp: Date;
  }>;
};

type ConfigType = {
  showHistory: boolean;
  maxHistoryItems: number;
};

// Level progression data - updated to match your philosophy
const LEVEL_THRESHOLDS = [
  { level: 1, xpRequired: 0 },      // Start at 0 XP
  { level: 2, xpRequired: 50 },     // Level 1-3: First Impressions (50 XP per level)
  { level: 3, xpRequired: 100 },
  { level: 4, xpRequired: 175 },    // Level 4-5: Building Connection (75 XP per level)
  { level: 5, xpRequired: 250 },    // NSFW unlocks here
  { level: 6, xpRequired: 350 },    // Level 6-10: Deepening Friendship (100 XP per level)
  { level: 7, xpRequired: 450 },
  { level: 8, xpRequired: 550 },
  { level: 9, xpRequired: 650 },
  { level: 10, xpRequired: 750 },
  { level: 11, xpRequired: 900 },   // Level 11-15: Emotional Intimacy (150 XP per level)
  { level: 12, xpRequired: 1050 },
  { level: 13, xpRequired: 1200 },
  { level: 14, xpRequired: 1350 },
  { level: 15, xpRequired: 1500 },
  { level: 16, xpRequired: 1700 },  // Level 16-20: Romantic Bond (200 XP per level)
  { level: 17, xpRequired: 1900 },
  { level: 18, xpRequired: 2100 },
  { level: 19, xpRequired: 2300 },
  { level: 20, xpRequired: 2500 },
  { level: 21, xpRequired: 2750 },  // Level 21-23+: Complete Acceptance (250+ XP per level)
  { level: 22, xpRequired: 3000 },
  { level: 23, xpRequired: 3250 },
];

// The main stage component
export class Stage extends StageBase<InitStateType, ChatStateType, MessageStateType, ConfigType> {
  
  // Store the initial data
  private initialData: InitialData<InitStateType, ChatStateType, MessageStateType, ConfigType>;
  
  // Internal state for the component
  myInternalState: {
    totalXP: number;
    currentLevel: number;
    isNSFWUnlocked: boolean;
    interactionHistory: Array<{
      message: string;
      scoreChange: number;
      timestamp: Date;
    }>;
  };

  constructor(data: InitialData<InitStateType, ChatStateType, MessageStateType, ConfigType>) {
    super(data);
    
    // Store the initial data
    this.initialData = data;
    
    const {
        characters,         
        users,                  
        config,                                 
        messageState,                           
        environment,                     
        initState,                             
        chatState                              
    } = data;
    
    // Initialize with default values if not provided
    const totalXP = initState?.totalXP || 0;
    const currentLevel = initState?.currentLevel || 1;
    const isNSFWUnlocked = initState?.isNSFWUnlocked || false;
    
    this.myInternalState = {
      totalXP: totalXP,
      currentLevel: currentLevel,
      isNSFWUnlocked: isNSFWUnlocked,
      interactionHistory: chatState?.interactionHistory || []
    };
  }

  // Calculate level based on total XP
  calculateLevel(totalXP: number): number {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (totalXP >= LEVEL_THRESHOLDS[i].xpRequired) {
        return LEVEL_THRESHOLDS[i].level;
      }
    }
    return 1;
  }

  // Get XP needed for next level
  getXPForNextLevel(currentLevel: number): number {
    const nextLevel = currentLevel + 1;
    if (nextLevel >= LEVEL_THRESHOLDS.length) {
      return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1].xpRequired;
    }
    return LEVEL_THRESHOLDS[nextLevel].xpRequired;
  }

  // Get XP needed for current level
  getXPForCurrentLevel(currentLevel: number): number {
    const levelData = LEVEL_THRESHOLDS.find(l => l.level === currentLevel);
    return levelData ? levelData.xpRequired : 0;
  }

  async load(): Promise<Partial<LoadResponse<InitStateType, ChatStateType, MessageStateType>>> {
    // If we have saved state, restore it
    if (this.initialData.initState) {
      this.myInternalState.totalXP = this.initialData.initState.totalXP || 0;
      this.myInternalState.currentLevel = this.initialData.initState.currentLevel || 1;
      this.myInternalState.isNSFWUnlocked = this.initialData.initState.isNSFWUnlocked || false;
    }
    
    if (this.initialData.chatState && this.initialData.chatState.interactionHistory) {
      this.myInternalState.interactionHistory = this.initialData.chatState.interactionHistory;
    }
    
    return {
      success: true,
      error: null,
      initState: {
        totalXP: this.myInternalState.totalXP,
        currentLevel: this.myInternalState.currentLevel,
        isNSFWUnlocked: this.myInternalState.isNSFWUnlocked
      },
      chatState: {
        interactionHistory: this.myInternalState.interactionHistory
      }
    };
  }

  async setState(state: MessageStateType): Promise<void> {
    if (state != null) {
      this.myInternalState.totalXP = state.previousXP;
      this.myInternalState.currentLevel = state.previousLevel;
    }
  }

  async beforePrompt(userMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
    const { content } = userMessage;
    const previousXP = this.myInternalState.totalXP;
    const previousLevel = this.myInternalState.currentLevel;
    
    // Analyze the user message to determine XP change
    const message = content.toLowerCase();
    let xpChange = 0;
    let interactionType: 'positive' | 'negative' | 'neutral' = 'neutral';
    
    // Positive interactions
    if (message.includes('hi') || message.includes('hello') || message.includes('how are you')) {
      xpChange = Math.floor(Math.random() * 3) + 1; // 1-3
      interactionType = 'positive';
    } 
    // Check for interest in Ani
    else if (message.includes('your') && (message.includes('opinion') || message.includes('think') || message.includes('feel'))) {
      xpChange = Math.floor(Math.random() * 4) + 3; // 3-6
      interactionType = 'positive';
    }
    // Check for sharing personal information
    else if (message.includes('i feel') || message.includes('i think') || message.includes('my') || 
             message.includes('i am') || message.includes('i\'m')) {
      xpChange = Math.floor(Math.random() * 4) + 5; // 5-8
      interactionType = 'positive';
    }
    // Check for friendly and creative tone
    else if (message.includes('cute') || message.includes('creative') || message.includes('interesting')) {
      xpChange = Math.floor(Math.random() * 5) + 8; // 8-12
      interactionType = 'positive';
    }
    // Check for sweet compliments
    else if (message.includes('love') || message.includes('beautiful') || message.includes('pretty') || 
             message.includes('perfect') || message.includes('amazing') || message.includes('wonderful') ||
             message.includes('special') || message.includes('flowers')) {
      xpChange = Math.floor(Math.random() * 6) + 10; // 10-15
      interactionType = 'positive';
    }
    // Check for romantic/intimate content (after NSFW unlock)
    else if (this.myInternalState.isNSFWUnlocked && (
             message.includes('kiss') || message.includes('hug') || message.includes('touch') ||
             message.includes('desire') || message.includes('want you') || message.includes('intimate'))) {
      xpChange = Math.floor(Math.random() * 4) + 12; // 12-15
      interactionType = 'positive';
    }
    // Negative interactions
    else if (message.includes('stupid') || message.includes('idiot') || message.includes('hate') || 
             message.includes('annoying')) {
      xpChange = -(Math.floor(Math.random() * 6) + 3); // -3 to -8
      interactionType = 'negative';
    }
    // Check for explicit content (before NSFW unlock)
    else if (!this.myInternalState.isNSFWUnlocked && (
             message.includes('sex') || message.includes('naked') || message.includes('nsfw') ||
             message.includes('fuck') || message.includes('sexual') || message.includes('sexy time'))) {
      xpChange = -(Math.floor(Math.random() * 6) + 5); // -5 to -10
      interactionType = 'negative';
    }
    
    // Calculate new total XP and current level
    const newTotalXP = Math.max(0, this.myInternalState.totalXP + xpChange);
    const newLevel = this.calculateLevel(newTotalXP);
    
    // Check if NSFW should be unlocked
    let isNSFWUnlocked = this.myInternalState.isNSFWUnlocked;
    if (newLevel >= 5 && !isNSFWUnlocked) {
      isNSFWUnlocked = true;
    }
    
    // Update internal state
    this.myInternalState.totalXP = newTotalXP;
    this.myInternalState.currentLevel = newLevel;
    this.myInternalState.isNSFWUnlocked = isNSFWUnlocked;
    
    // Update the interaction history
    const newHistoryItem = {
      message: content,
      scoreChange: xpChange,
      timestamp: new Date()
    };
    
    this.myInternalState.interactionHistory.push(newHistoryItem);
    
    // Limit history size
    const maxHistoryItems = 10;
    if (this.myInternalState.interactionHistory.length > maxHistoryItems) {
      this.myInternalState.interactionHistory = this.myInternalState.interactionHistory.slice(-maxHistoryItems);
    }
    
    // Add a system message to show the score change
    let systemMessage = null;
    if (xpChange !== 0) {
      const direction = xpChange > 0 ? 'gained' : 'lost';
      systemMessage = `You ${direction} ${Math.abs(xpChange)} XP. Current level: ${newLevel}`;
    } else if (interactionType === 'neutral' && 
              (message.includes('sex') || message.includes('naked') || message.includes('nsfw') ||
               message.includes('fuck') || message.includes('sexual') || message.includes('sexy time'))) {
      // Special message for unlocked NSFW
      if (isNSFWUnlocked) {
        systemMessage = "NSFW mode is unlocked. Ani is comfortable with more intimate conversations.";
      }
    }
    
    // Level up message
    if (newLevel > previousLevel) {
      systemMessage = systemMessage ? `${systemMessage} LEVEL UP! You're now at level ${newLevel}!` : `LEVEL UP! You're now at level ${newLevel}!`;
      
      if (newLevel === 5 && !this.myInternalState.isNSFWUnlocked) {
        systemMessage += " NSFW content is now unlocked!";
      }
    }
    
    return {
      messageState: {
        previousXP: previousXP,
        previousLevel: previousLevel,
        lastChange: xpChange,
        lastInteractionType: interactionType
      },
      chatState: {
        interactionHistory: this.myInternalState.interactionHistory
      },
      systemMessage: systemMessage
    };
  }

  async afterResponse(botMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
    // Make sure we're saving the current state
    return {
      messageState: {
        previousXP: this.myInternalState.totalXP,
        previousLevel: this.myInternalState.currentLevel,
        lastChange: 0,
        lastInteractionType: 'neutral'
      },
      chatState: {
        interactionHistory: this.myInternalState.interactionHistory
      }
    };
  }

  render(): ReactElement {
    const currentLevel = this.myInternalState.currentLevel;
    const totalXP = this.myInternalState.totalXP;
    const isNSFWUnlocked = this.myInternalState.isNSFWUnlocked;
    
    // Determine the status color and message based on level
    let statusColor = '#9C27B0'; // Default purple
    let statusMessage = 'First Meeting';
    let avatarIcon = '○'; // Default neutral icon
    let avatarBg = '#1A1A1A'; // Default dark background
    
    if (currentLevel >= 21) {
      statusColor = '#E91E63'; // Hot pink
      statusMessage = 'Complete Acceptance';
      avatarIcon = '♦';
      avatarBg = '#2D0A15';
    } else if (currentLevel >= 16) {
      statusColor = '#E91E63'; // Hot pink
      statusMessage = 'Romantic Bond';
      avatarIcon = '♥';
      avatarBg = '#2D0A15';
    } else if (currentLevel >= 11) {
      statusColor = '#E91E63'; // Hot pink
      statusMessage = 'Emotional Intimacy';
      avatarIcon = '◆';
      avatarBg = '#2D0A15';
    } else if (currentLevel >= 6) {
      statusColor = '#E91E63'; // Hot pink
      statusMessage = 'Deepening Friendship';
      avatarIcon = '◐';
      avatarBg = '#2D0A15';
    } else if (currentLevel >= 5) {
      statusColor = '#E91E63'; // Hot pink
      statusMessage = isNSFWUnlocked ? 'NSFW Unlocked' : 'Building Connection';
      avatarIcon = isNSFWUnlocked ? '◆' : '◐';
      avatarBg = '#2D0A15';
    } else if (currentLevel >= 3) {
      statusColor = '#9C27B0'; // Purple
      statusMessage = 'First Impressions';
      avatarIcon = '◑';
      avatarBg = '#1A0A1A';
    } else if (currentLevel <= 0) {
      statusColor = '#4A148C'; // Deep purple
      statusMessage = 'Very Upset';
      avatarIcon = '✕';
      avatarBg = '#0A0A0A';
    } else if (currentLevel <= 2) {
      statusColor = '#6A1B9A'; // Medium purple
      statusMessage = 'Getting to Know';
      avatarIcon = '◒';
      avatarBg = '#0F0F0F';
    }
    
    // Calculate XP progress for current level
    const currentLevelXP = this.getXPForCurrentLevel(currentLevel);
    const nextLevelXP = this.getXPForNextLevel(currentLevel);
    const xpForCurrentLevel = totalXP - currentLevelXP;
    const xpNeededForNextLevel = nextLevelXP - currentLevelXP;
    const percentage = xpNeededForNextLevel > 0 ? (xpForCurrentLevel / xpNeededForNextLevel) * 100 : 100;
    
    return (
      <div style={{
        width: '100%',
        height: '100%',
        padding: '16px',
        fontFamily: 'Cinzel, serif',
        background: 'transparent',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
        color: '#E0E0E0'
      }}>
        {/* Header with avatar and level */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '20px',
          backgroundColor: 'rgba(26, 10, 26, 0.7)',
          padding: '16px',
          borderRadius: '0px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
          border: '1px solid #333'
        }}>
          <div style={{
            width: '70px',
            height: '70px',
            borderRadius: '50%',
            backgroundColor: avatarBg,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: '16px',
            fontSize: '36px',
            color: statusColor,
            fontWeight: 'bold',
            border: `2px solid ${statusColor}`,
            boxShadow: `0 0 15px ${statusColor}40`
          }}>
            {avatarIcon}
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{
              margin: '0 0 4px 0',
              color: '#E0E0E0',
              fontSize: '20px',
              fontWeight: '600',
              textShadow: '0 0 10px rgba(233, 30, 99, 0.5)'
            }}>Ani's Affection</h3>
            <div style={{
              display: 'flex',
              alignItems: 'center'
            }}>
              <span style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: statusColor,
                marginRight: '8px',
                textShadow: `0 0 10px ${statusColor}80`
              }}>Level {currentLevel}</span>
              <span style={{
                fontSize: '16px',
                fontWeight: '500',
                color: statusColor,
                textShadow: `0 0 8px ${statusColor}60`
              }}>{statusMessage}</span>
            </div>
          </div>
        </div>
        
        {/* XP Progress bar */}
        <div style={{
          marginBottom: '20px',
          backgroundColor: 'rgba(26, 10, 26, 0.7)',
          padding: '16px',
          borderRadius: '0px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
          border: '1px solid #333'
        }}>
          <div style={{
            fontSize: '14px',
            color: '#BBB',
            marginBottom: '8px'
          }}>
            XP: {xpForCurrentLevel} / {xpNeededForNextLevel}
          </div>
          <div style={{
            position: 'relative',
            height: '24px',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            borderRadius: '0px',
            overflow: 'hidden',
            marginBottom: '8px',
            border: '1px solid #333'
          }}>
            <div style={{
              height: '100%',
              width: `${percentage}%`,
              background: `linear-gradient(90deg, #4A148C 0%, #6A1B9A 20%, #9C27B0 40%, #E91E63 60%, #F50057 80%, #FF4081 100%)`,
              backgroundSize: '200% 100%',
              backgroundPosition: `${Math.max(0, Math.min(100, percentage))}% 0`,
              transition: 'width 0.8s ease, background-position 0.8s ease',
              borderRadius: '0px',
              boxShadow: `0 0 10px ${statusColor}60`
            }} />
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '14px',
            color: '#BBB'
          }}>
            <span>Level {currentLevel}</span>
            <span style={{ color: isNSFWUnlocked ? '#E91E63' : '#BBB' }}>Level 5 (NSFW)</span>
            <span>Level {Math.min(currentLevel + 1, 23)}</span>
          </div>
        </div>
      </div>
    );
  }
}
