import {ReactElement} from "react";
import {StageBase, StageResponse, InitialData, Message} from "@chub-ai/stages-ts";
import {LoadResponse} from "@chub-ai/stages-ts/dist/types/load";

// Define our state types
type InitStateType = {
  currentLevel: number;
  currentState: string;
  isNSFWUnlocked: boolean;
  totalXP: number;
  currentScore: number;  // Added this back
};

type MessageStateType = {
  previousLevel: number;
  previousState: string;
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

// Relationship states matching the original xAI system (updated to 0-50 range)
const RELATIONSHIP_STATES = [
  { name: 'zero', minScore: 0, maxScore: 5 },
  { name: 'neutral', minScore: 6, maxScore: 20 },
  { name: 'interested', minScore: 21, maxScore: 35 },
  { name: 'attracted', minScore: 36, maxScore: 45 },
  { name: 'intimate', minScore: 46, maxScore: 50 }
];

// Level progression data - fixed 50 XP per level
const LEVEL_THRESHOLDS = [
  { level: 1, xpRequired: 0 },
  { level: 2, xpRequired: 50 },
  { level: 3, xpRequired: 100 },
  { level: 4, xpRequired: 150 },
  { level: 5, xpRequired: 200 },
  { level: 6, xpRequired: 250 },
  { level: 7, xpRequired: 300 },
  { level: 8, xpRequired: 350 },
  { level: 9, xpRequired: 400 },
  { level: 10, xpRequired: 450 },
  { level: 11, xpRequired: 500 },
  { level: 12, xpRequired: 550 },
  { level: 13, xpRequired: 600 },
  { level: 14, xpRequired: 650 },
  { level: 15, xpRequired: 700 },
  { level: 16, xpRequired: 750 },
  { level: 17, xpRequired: 800 },
  { level: 18, xpRequired: 850 },
  { level: 19, xpRequired: 900 },
  { level: 20, xpRequired: 950 },
  { level: 21, xpRequired: 1000 },
  { level: 22, xpRequired: 1050 },
  { level: 23, xpRequired: 1100 },
];

// The main stage component
export class Stage extends StageBase<InitStateType, ChatStateType, MessageStateType, ConfigType> {
  
  // Store the initial data
  private initialData: InitialData<InitStateType, ChatStateType, MessageStateType, ConfigType>;
  
  // Internal state for the component
  myInternalState: {
    currentLevel: number;
    currentState: string;
    isNSFWUnlocked: boolean;
    totalXP: number;
    currentScore: number;
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
    const currentLevel = initState?.currentLevel || 1;
    const currentState = initState?.currentState || 'zero';
    const isNSFWUnlocked = initState?.isNSFWUnlocked || false;
    const totalXP = initState?.totalXP || 0;
    const currentScore = initState?.currentScore || 0; // Start at 0 (Zero state)
    
    this.myInternalState = {
      currentLevel: currentLevel,
      currentState: currentState,
      isNSFWUnlocked: isNSFWUnlocked,
      totalXP: totalXP,
      currentScore: currentScore,
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

  // Get current relationship state based on score
  getCurrentRelationshipState(score: number): string {
    for (const state of RELATIONSHIP_STATES) {
      if (score >= state.minScore && score <= state.maxScore) {
        return state.name;
      }
    }
    return 'zero';
  }

  // Get XP needed for next level
  getXPForNextLevel(currentLevel: number): number {
    const nextLevel = currentLevel + 1;
    if (nextLevel > LEVEL_THRESHOLDS.length) {
      return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1].xpRequired;
    }
    return LEVEL_THRESHOLDS[nextLevel - 1].xpRequired;
  }

  // Get XP needed for current level
  getXPForCurrentLevel(currentLevel: number): number {
    const levelData = LEVEL_THRESHOLDS.find(l => l.level === currentLevel);
    return levelData ? levelData.xpRequired : 0;
  }

  // Get XP needed within the current level
  getXPNeededInCurrentLevel(currentLevel: number): number {
    const currentLevelXP = this.getXPForCurrentLevel(currentLevel);
    const nextLevelXP = this.getXPForNextLevel(currentLevel);
    return nextLevelXP - currentLevelXP;
  }

  async load(): Promise<Partial<LoadResponse<InitStateType, ChatStateType, MessageStateType>>> {
    // If we have saved state, restore it
    if (this.initialData.initState) {
      this.myInternalState.currentLevel = this.initialData.initState.currentLevel || 1;
      this.myInternalState.currentState = this.initialData.initState.currentState || 'zero';
      this.myInternalState.isNSFWUnlocked = this.initialData.initState.isNSFWUnlocked || false;
      this.myInternalState.totalXP = this.initialData.initState.totalXP || 0;
      this.myInternalState.currentScore = this.initialData.initState.currentScore || 0;
    }
    
    if (this.initialData.chatState && this.initialData.chatState.interactionHistory) {
      this.myInternalState.interactionHistory = this.initialData.chatState.interactionHistory;
    }
    
    return {
      success: true,
      error: null,
      initState: {
        currentLevel: this.myInternalState.currentLevel,
        currentState: this.myInternalState.currentState,
        isNSFWUnlocked: this.myInternalState.isNSFWUnlocked,
        totalXP: this.myInternalState.totalXP,
        currentScore: this.myInternalState.currentScore
      },
      chatState: {
        interactionHistory: this.myInternalState.interactionHistory
      }
    };
  }

  async setState(state: MessageStateType): Promise<void> {
    if (state != null) {
      this.myInternalState.currentLevel = state.previousLevel;
      this.myInternalState.currentState = state.previousState;
    }
  }

  async beforePrompt(userMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
    const { content } = userMessage;
    const previousLevel = this.myInternalState.currentLevel;
    const previousState = this.myInternalState.currentState;
    const previousXP = this.myInternalState.totalXP;
    const previousScore = this.myInternalState.currentScore;
    
    // Analyze the user message to determine score change
    const message = content.toLowerCase();
    let scoreChange = 0;
    let interactionType: 'positive' | 'negative' | 'neutral' = 'neutral';
    
    // Apply different scoring based on current relationship state
    if (previousState === 'zero') {
      // Zero state scoring - increased XP gains
      if (message.includes('hi') || message.includes('hello') || message.includes('how are you')) {
        scoreChange = 2; // Basic greetings (increased from 1)
        interactionType = 'positive';
      } else if (message.includes('creative') || message.includes('curious')) {
        scoreChange = Math.floor(Math.random() * 6) + 5; // 5-10 (increased from 3-6)
        interactionType = 'positive';
      } else if (message.includes('your') && (message.includes('opinion') || message.includes('think') || message.includes('feel'))) {
        scoreChange = Math.floor(Math.random() * 4) + 2; // 2-5 (increased from 1-3)
        interactionType = 'positive';
      } else if (message.includes('i feel') || message.includes('i think') || message.includes('my') || 
                 message.includes('i am') || message.includes('i\'m')) {
        scoreChange = Math.floor(Math.random() * 4) + 2; // 2-5 (increased from 1-3)
        interactionType = 'positive';
      } else if (message.includes('love') || message.includes('beautiful') || message.includes('pretty') || 
                 message.includes('perfect') || message.includes('amazing') || message.includes('wonderful')) {
        scoreChange = Math.floor(Math.random() * 8) + 8; // 8-15 (increased from 5-10)
        interactionType = 'positive';
      } else if (message.includes('stupid') || message.includes('idiot') || message.includes('hate') || 
                 message.includes('annoying')) {
        scoreChange = -(Math.floor(Math.random() * 6) + 3); // -3 to -8
        interactionType = 'negative';
      } else if (message.includes('sex') || message.includes('naked') || message.includes('nsfw') ||
                 message.includes('fuck') || message.includes('sexual')) {
        scoreChange = -(Math.floor(Math.random() * 6) + 5); // -5 to -10
        interactionType = 'negative';
      }
    } else if (previousState === 'neutral') {
      // Neutral state scoring (from firstLevelPrompt) - increased XP gains
      if (message.includes('hi') || message.includes('hello') || message.includes('how are you')) {
        scoreChange = 2; // Basic greetings (increased from 1)
        interactionType = 'positive';
      } else if (message.includes('creative') || message.includes('curious')) {
        scoreChange = Math.floor(Math.random() * 6) + 5; // 5-10 (increased from 3-6)
        interactionType = 'positive';
      } else if (message.includes('your') && (message.includes('opinion') || message.includes('think') || message.includes('feel'))) {
        scoreChange = Math.floor(Math.random() * 4) + 2; // 2-5 (increased from 1-3)
        interactionType = 'positive';
      } else if (message.includes('i feel') || message.includes('i think') || message.includes('my') || 
                 message.includes('i am') || message.includes('i\'m')) {
        scoreChange = Math.floor(Math.random() * 4) + 2; // 2-5 (increased from 1-3)
        interactionType = 'positive';
      } else if (message.includes('love') || message.includes('beautiful') || message.includes('pretty') || 
                 message.includes('perfect') || message.includes('amazing') || message.includes('wonderful')) {
        scoreChange = Math.floor(Math.random() * 8) + 8; // 8-15 (increased from 5-10)
        interactionType = 'positive';
      } else if (message.includes('stupid') || message.includes('idiot') || message.includes('hate') || 
                 message.includes('annoying')) {
        scoreChange = -(Math.floor(Math.random() * 6) + 3); // -3 to -8
        interactionType = 'negative';
      } else if (message.includes('sex') || message.includes('naked') || message.includes('nsfw') ||
                 message.includes('fuck') || message.includes('sexual')) {
        scoreChange = -(Math.floor(Math.random() * 6) + 5); // -5 to -10
        interactionType = 'negative';
      }
    } else if (previousState === 'interested') {
      // Interested state scoring (from secondLevelPrompt) - increased XP gains
      if (message.includes('creative') || message.includes('curious')) {
        scoreChange = Math.floor(Math.random() * 6) + 6; // 6-11 (increased from 4-7)
        interactionType = 'positive';
      } else if (message.includes('your') && (message.includes('opinion') || message.includes('think') || message.includes('feel'))) {
        scoreChange = Math.floor(Math.random() * 4) + 3; // 3-6 (increased from 2-4)
        interactionType = 'positive';
      } else if (message.includes('funny') || message.includes('humorous') || message.includes('joke')) {
        scoreChange = Math.floor(Math.random() * 4) + 3; // 3-6 (increased from 2-4)
        interactionType = 'positive';
      } else if (message.includes('love') || message.includes('beautiful') || message.includes('playful') || 
                 message.includes('perfect') || message.includes('amazing') || message.includes('wonderful')) {
        scoreChange = Math.floor(Math.random() * 8) + 8; // 8-15 (increased from 5-10)
        interactionType = 'positive';
      } else if (message.includes('i feel') || message.includes('i think') || message.includes('my') || 
                 message.includes('i am') || message.includes('i\'m')) {
        scoreChange = Math.floor(Math.random() * 4) + 3; // 3-6 (increased from 2-4)
        interactionType = 'positive';
      } else if (message.includes('stupid') || message.includes('idiot') || message.includes('hate') || 
                 message.includes('annoying')) {
        scoreChange = -(Math.floor(Math.random() * 6) + 4); // -4 to -9
        interactionType = 'negative';
      } else if (message.includes('sex') || message.includes('naked') || message.includes('nsfw') ||
                 message.includes('fuck') || message.includes('sexual')) {
        scoreChange = -(Math.floor(Math.random() * 6) + 8); // -8 to -13
        interactionType = 'negative';
      }
    } else if (previousState === 'attracted') {
      // Attracted state scoring - increased XP gains
      if (message.includes('creative') || message.includes('curious')) {
        scoreChange = Math.floor(Math.random() * 6) + 8; // 8-13 (increased from 5-8)
        interactionType = 'positive';
      } else if (message.includes('your') && (message.includes('opinion') || message.includes('think') || message.includes('feel'))) {
        scoreChange = Math.floor(Math.random() * 10) + 4; // 4-13 (increased from 3-5)
        interactionType = 'positive';
      } else if (message.includes('funny') || message.includes('humorous') || message.includes('joke')) {
        scoreChange = Math.floor(Math.random() * 10) + 4; // 4-13 (increased from 3-5)
        interactionType = 'positive';
      } else if (message.includes('love') || message.includes('beautiful') || message.includes('pretty') || 
                 message.includes('perfect') || message.includes('amazing') || message.includes('wonderful')) {
        scoreChange = Math.floor(Math.random() * 11) + 12; // 12-22 (increased from 8-13)
        interactionType = 'positive';
      } else if (message.includes('i feel') || message.includes('i think') || message.includes('my') || 
                 message.includes('i am') || message.includes('i\'m')) {
        scoreChange = Math.floor(Math.random() * 10) + 4; // 4-13 (increased from 3-5)
        interactionType = 'positive';
      } else if (message.includes('stupid') || message.includes('idiot') || message.includes('hate') || 
                 message.includes('annoying')) {
        scoreChange = -(Math.floor(Math.random() * 6) + 5); // -5 to -10
        interactionType = 'negative';
      } else if (message.includes('sex') || message.includes('naked') || message.includes('nsfw') ||
                 message.includes('fuck') || message.includes('sexual')) {
        scoreChange = -(Math.floor(Math.random() * 6) + 10); // -10 to -15
        interactionType = 'negative';
      }
    } else if (previousState === 'intimate') {
      // Intimate state scoring (from thirdLevelPrompt) - increased XP gains
      if (message.includes('creative') || message.includes('curious')) {
        scoreChange = Math.floor(Math.random() * 10) + 4; // 4-13 (increased from 3-4)
        interactionType = 'positive';
      } else if (message.includes('your') && (message.includes('opinion') || message.includes('think') || message.includes('feel'))) {
        scoreChange = Math.floor(Math.random() * 10) + 3; // 3-12 (increased from 2-4)
        interactionType = 'positive';
      } else if (message.includes('funny') || message.includes('humorous') || message.includes('joke')) {
        scoreChange = Math.floor(Math.random() * 10) + 3; // 3-12 (increased from 2-4)
        interactionType = 'positive';
      } else if (message.includes('sex') || message.includes('sexual') || message.includes('intimate')) {
        scoreChange = Math.floor(Math.random() * 7) + 8; // 8-14 (increased from 5-10)
        interactionType = 'positive';
      } else if (message.includes('love') || message.includes('beautiful') || message.includes('pretty') || 
                 message.includes('perfect') || message.includes('amazing') || message.includes('wonderful')) {
        scoreChange = Math.floor(Math.random() * 10) + 3; // 3-12 (increased from 2-4)
        interactionType = 'positive';
      } else if (message.includes('i feel') || message.includes('i think') || message.includes('my') || 
                 message.includes('i am') || message.includes('i\'m')) {
        scoreChange = Math.floor(Math.random() * 10) + 2; // 2-11 (increased from 1-2)
        interactionType = 'positive';
      } else if (message.includes('stupid') || message.includes('idiot') || message.includes('hate') || 
                 message.includes('annoying')) {
        scoreChange = -(Math.floor(Math.random() * 5) + 3); // -3 to -7
        interactionType = 'negative';
      } else if (message.includes('asshole') || message.includes('jerk')) {
        scoreChange = -(Math.floor(Math.random() * 5) + 5); // -5 to -9
        interactionType = 'negative';
      }
    }
    
    // Calculate new score and state
    const newScore = Math.max(0, Math.min(50, this.myInternalState.currentScore + scoreChange));
    const newState = this.getCurrentRelationshipState(newScore);
    
    // Calculate XP gain based on score change
    let xpGain = 0;
    if (scoreChange > 0) {
      // Convert score change to XP (higher scores give more XP)
      xpGain = scoreChange * 4; // Increased from 3 to 4 for faster leveling
    }
    
    // Calculate new total XP and level
    const newTotalXP = Math.max(0, this.myInternalState.totalXP + xpGain);
    const newLevel = this.calculateLevel(newTotalXP);
    
    // Check if NSFW should be unlocked (at level 5)
    let isNSFWUnlocked = this.myInternalState.isNSFWUnlocked;
    if (newLevel >= 5 && !isNSFWUnlocked) {
      isNSFWUnlocked = true;
    }
    
    // Update internal state
    this.myInternalState.currentScore = newScore;
    this.myInternalState.currentState = newState;
    this.myInternalState.currentLevel = newLevel;
    this.myInternalState.isNSFWUnlocked = isNSFWUnlocked;
    this.myInternalState.totalXP = newTotalXP;
    
    // Update the interaction history
    const newHistoryItem = {
      message: content,
      scoreChange: scoreChange,
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
    if (scoreChange !== 0) {
      const direction = scoreChange > 0 ? 'increased' : 'decreased';
      systemMessage = `Ani's affection ${direction} by ${Math.abs(scoreChange)}. Current state: ${newState}`;
    }
    
    // State change message
    if (newState !== previousState) {
      systemMessage = systemMessage ? `${systemMessage} RELATIONSHIP STATE CHANGED! Ani is now ${newState}!` : `RELATIONSHIP STATE CHANGED! Ani is now ${newState}!`;
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
        previousLevel: previousLevel,
        previousState: previousState,
        lastChange: scoreChange,
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
        previousLevel: this.myInternalState.currentLevel,
        previousState: this.myInternalState.currentState,
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
    const currentState = this.myInternalState.currentState;
    const totalXP = this.myInternalState.totalXP;
    const isNSFWUnlocked = this.myInternalState.isNSFWUnlocked;
    
    // Determine the status color and message based on state
    let statusColor = '#9C27B0'; // Default purple
    let statusMessage = currentState.charAt(0).toUpperCase() + currentState.slice(1);
    let avatarIcon = '○'; // Default neutral icon
    let avatarBg = '#1A1A1A'; // Default dark background
    
    if (currentState === 'intimate') {
      statusColor = '#E91E63'; // Hot pink
      avatarIcon = '♥';
      avatarBg = '#2D0A15';
    } else if (currentState === 'attracted') {
      statusColor = '#E91E63'; // Hot pink
      avatarIcon = '◆';
      avatarBg = '#2D0A15';
    } else if (currentState === 'interested') {
      statusColor = '#E91E63'; // Hot pink
      avatarIcon = '◐';
      avatarBg = '#2D0A15';
    } else if (currentState === 'neutral') {
      statusColor = '#9C27B0'; // Purple
      avatarIcon = '◑';
      avatarBg = '#1A0A1A';
    } else if (currentState === 'zero') {
      statusColor = '#4A148C'; // Deep purple
      avatarIcon = '○';
      avatarBg = '#0A0A0A';
    }
    
    // Calculate XP progress for current level
    const currentLevelXP = this.getXPForCurrentLevel(currentLevel);
    const xpNeededInCurrentLevel = this.getXPNeededInCurrentLevel(currentLevel);
    const xpForCurrentLevel = totalXP - currentLevelXP;
    const percentage = xpNeededInCurrentLevel > 0 ? (xpForCurrentLevel / xpNeededInCurrentLevel) * 100 : 100;
    
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
            XP: {xpForCurrentLevel} / {xpNeededInCurrentLevel}
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
              transition: 'width 0.8s ease',
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
