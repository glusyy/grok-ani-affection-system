import {ReactElement} from "react";
import {StageBase, StageResponse, InitialData, Message} from "@chub-ai/stages-ts";
import {LoadResponse} from "@chub-ai/stages-ts/dist/types/load";

// Define our state types
type InitStateType = {
  currentScore: number;
  currentLevel: number;
  currentState: string;
  isNSFWUnlocked: boolean;
};

type MessageStateType = {
  previousScore: number;
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

// Relationship states matching the original xAI system
const RELATIONSHIP_STATES = [
  { name: 'zero', minScore: 0, maxScore: 5 },
  { name: 'neutral', minScore: 6, maxScore: 35 },
  { name: 'interested', minScore: 36, maxScore: 60 },
  { name: 'attracted', minScore: 61, maxScore: 75 },
  { name: 'intimate', minScore: 76, maxScore: 100 }
];

// Level progression data
const LEVEL_THRESHOLDS = [
  { level: 1, xpRequired: 0 },      // Start at 0 XP
  { level: 2, xpRequired: 50 },     // Level 1-3: First Impressions (50 XP per level)
  { level: 3, xpRequired: 100 },    // Level 2: 50 XP
  { level: 4, xpRequired: 150 },    // Level 3: 50 XP
  { level: 5, xpRequired: 200 },    // Level 4-5: Building Connection (75 XP per level)
  { level: 6, xpRequired: 275 },    // Level 5: 75 XP
  { level: 7, xpRequired: 375 },    // Level 6-10: Deepening Friendship (100 XP per level)
  { level: 8, xpRequired: 475 },
  { level: 9, xpRequired: 575 },
  { level: 10, xpRequired: 675 },
  { level: 11, xpRequired: 775 },   // Level 11-15: Emotional Intimacy (150 XP per level)
  { level: 12, xpRequired: 925 },
  { level: 13, xpRequired: 1075 },
  { level: 14, xpRequired: 1225 },
  { level: 15, xpRequired: 1375 },
  { level: 16, xpRequired: 1525 },  // Level 16-20: Romantic Bond (200 XP per level)
  { level: 17, xpRequired: 1725 },
  { level: 18, xpRequired: 1925 },
  { level: 19, xpRequired: 2125 },
  { level: 20, xpRequired: 2325 },
  { level: 21, xpRequired: 2525 },  // Level 21-23+: Complete Acceptance (250+ XP per level)
  { level: 22, xpRequired: 2775 },
  { level: 23, xpRequired: 3025 },
];

// The main stage component
export class Stage extends StageBase<InitStateType, ChatStateType, MessageStateType, ConfigType> {
  
  // Store the initial data
  private initialData: InitialData<InitStateType, ChatStateType, MessageStateType, ConfigType>;
  
  // Internal state for the component
  myInternalState: {
    currentScore: number;
    currentLevel: number;
    currentState: string;
    isNSFWUnlocked: boolean;
    totalXP: number;
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
    const currentScore = initState?.currentScore || 0; // Start at 0 (Zero state)
    const currentLevel = initState?.currentLevel || 1;
    const currentState = initState?.currentState || 'zero';
    const isNSFWUnlocked = initState?.isNSFWUnlocked || false;
    const totalXP = initState?.totalXP || 0;
    
    this.myInternalState = {
      currentScore: currentScore,
      currentLevel: currentLevel,
      currentState: currentState,
      isNSFWUnlocked: isNSFWUnlocked,
      totalXP: totalXP,
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

  // Get XP needed within the current level
  getXPNeededInCurrentLevel(currentLevel: number): number {
    const currentLevelXP = this.getXPForCurrentLevel(currentLevel);
    const nextLevelXP = this.getXPForNextLevel(currentLevel);
    return nextLevelXP - currentLevelXP;
  }

  async load(): Promise<Partial<LoadResponse<InitStateType, ChatStateType, MessageStateType>>> {
    // If we have saved state, restore it
    if (this.initialData.initState) {
      this.myInternalState.currentScore = this.initialData.initState.currentScore || 0;
      this.myInternalState.currentLevel = this.initialData.initState.currentLevel || 1;
      this.myInternalState.currentState = this.initialData.initState.currentState || 'zero';
      this.myInternalState.isNSFWUnlocked = this.initialData.initState.isNSFWUnlocked || false;
      this.myInternalState.totalXP = this.initialData.initState.totalXP || 0;
    }
    
    if (this.initialData.chatState && this.initialData.chatState.interactionHistory) {
      this.myInternalState.interactionHistory = this.initialData.chatState.interactionHistory;
    }
    
    return {
      success: true,
      error: null,
      initState: {
        currentScore: this.myInternalState.currentScore,
        currentLevel: this.myInternalState.currentLevel,
        currentState: this.myInternalState.currentState,
        isNSFWUnlocked: this.myInternalState.isNSFWUnlocked,
        totalXP: this.myInternalState.totalXP
      },
      chatState: {
        interactionHistory: this.myInternalState.interactionHistory
      }
    };
  }

  async setState(state: MessageStateType): Promise<void> {
    if (state != null) {
      this.myInternalState.currentScore = state.previousScore;
      this.myInternalState.currentLevel = state.previousLevel;
      this.myInternalState.currentState = state.previousState;
    }
  }

  async beforePrompt(userMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
    const { content } = userMessage;
    const previousScore = this.myInternalState.currentScore;
    const previousLevel = this.myInternalState.currentLevel;
    const previousState = this.myInternalState.currentState;
    const previousXP = this.myInternalState.totalXP;
    
    // Analyze the user message to determine score change
    const message = content.toLowerCase();
    let scoreChange = 0;
    let interactionType: 'positive' | 'negative' | 'neutral' = 'neutral';
    
    // Apply different scoring based on current relationship state
    if (previousState === 'zero') {
      // Zero state scoring
      if (message.includes('hi') || message.includes('hello') || message.includes('how are you')) {
        scoreChange = 1; // Basic greetings
        interactionType = 'positive';
      } else if (message.includes('creative') || message.includes('curious')) {
        scoreChange = Math.floor(Math.random() * 4) + 3; // 3-6
        interactionType = 'positive';
      } else if (message.includes('your') && (message.includes('opinion') || message.includes('think') || message.includes('feel'))) {
        scoreChange = Math.floor(Math.random() * 3) + 1; // 1-3
        interactionType = 'positive';
      } else if (message.includes('i feel') || message.includes('i think') || message.includes('my') || 
                 message.includes('i am') || message.includes('i\'m')) {
        scoreChange = Math.floor(Math.random() * 3) + 1; // 1-3
        interactionType = 'positive';
      } else if (message.includes('love') || message.includes('beautiful') || message.includes('pretty') || 
                 message.includes('perfect') || message.includes('amazing') || message.includes('wonderful')) {
        scoreChange = Math.floor(Math.random() * 6) + 5; // 5-10
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
      // Neutral state scoring (from firstLevelPrompt)
      if (message.includes('hi') || message.includes('hello') || message.includes('how are you')) {
        scoreChange = 1; // Basic greetings
        interactionType = 'positive';
      } else if (message.includes('creative') || message.includes('curious')) {
        scoreChange = Math.floor(Math.random() * 4) + 3; // 3-6
        interactionType = 'positive';
      } else if (message.includes('your') && (message.includes('opinion') || message.includes('think') || message.includes('feel'))) {
        scoreChange = Math.floor(Math.random() * 3) + 1; // 1-3
        interactionType = 'positive';
      } else if (message.includes('i feel') || message.includes('i think') || message.includes('my') || 
                 message.includes('i am') || message.includes('i\'m')) {
        scoreChange = Math.floor(Math.random() * 3) + 1; // 1-3
        interactionType = 'positive';
      } else if (message.includes('love') || message.includes('beautiful') || message.includes('pretty') || 
                 message.includes('perfect') || message.includes('amazing') || message.includes('wonderful')) {
        scoreChange = Math.floor(Math.random() * 6) + 5; // 5-10
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
      // Interested state scoring (from secondLevelPrompt)
      if (message.includes('creative') || message.includes('curious')) {
        scoreChange = Math.floor(Math.random() * 4) + 4; // 4-7
        interactionType = 'positive';
      } else if (message.includes('your') && (message.includes('opinion') || message.includes('think') || message.includes('feel'))) {
        scoreChange = Math.floor(Math.random() * 3) + 2; // 2-4
        interactionType = 'positive';
      } else if (message.includes('funny') || message.includes('humorous') || message.includes('joke')) {
        scoreChange = Math.floor(Math.random() * 3) + 2; // 2-4
        interactionType = 'positive';
      } else if (message.includes('love') || message.includes('beautiful') || message.includes('pretty') || 
                 message.includes('perfect') || message.includes('amazing') || message.includes('wonderful')) {
        scoreChange = Math.floor(Math.random() * 6) + 5; // 5-10
        interactionType = 'positive';
      } else if (message.includes('i feel') || message.includes('i think') || message.includes('my') || 
                 message.includes('i am') || message.includes('i\'m')) {
        scoreChange = Math.floor(Math.random() * 3) + 2; // 2-4
        interactionType = 'positive';
      } else if (message.includes('stupid') || message.includes('idiot') || message.includes('hate') || 
                 message.includes('annoying')) {
        scoreChange = -(Math.floor(Math.random() * 7) + 4); // -4 to -10
        interactionType = 'negative';
      } else if (message.includes('sex') || message.includes('naked') || message.includes('nsfw') ||
                 message.includes('fuck') || message.includes('sexual')) {
        scoreChange = -(Math.floor(Math.random() * 7) + 8); // -8 to -14
        interactionType = 'negative';
      }
    } else if (previousState === 'attracted') {
      // Attracted state scoring
      if (message.includes('creative') || message.includes('curious')) {
        scoreChange = Math.floor(Math.random() * 4) + 5; // 5-8
        interactionType = 'positive';
      } else if (message.includes('your') && (message.includes('opinion') || message.includes('think') || message.includes('feel'))) {
        scoreChange = Math.floor(Math.random() * 3) + 3; // 3-5
        interactionType = 'positive';
      } else if (message.includes('funny') || message.includes('humorous') || message.includes('joke')) {
        scoreChange = Math.floor(Math.random() * 3) + 3; // 3-5
        interactionType = 'positive';
      } else if (message.includes('love') || message.includes('beautiful') || message.includes('pretty') || 
                 message.includes('perfect') || message.includes('amazing') || message.includes('wonderful')) {
        scoreChange = Math.floor(Math.random() * 6) + 8; // 8-13
        interactionType = 'positive';
      } else if (message.includes('i feel') || message.includes('i think') || message.includes('my') || 
                 message.includes('i am') || message.includes('i\'m')) {
        scoreChange = Math.floor(Math.random() * 3) + 3; // 3-5
        interactionType = 'positive';
      } else if (message.includes('stupid') || message.includes('idiot') || message.includes('hate') || 
                 message.includes('annoying')) {
        scoreChange = -(Math.floor(Math.random() * 7) + 5); // -5 to -11
        interactionType = 'negative';
      } else if (message.includes('sex') || message.includes('naked') || message.includes('nsfw') ||
                 message.includes('fuck') || message.includes('sexual')) {
        scoreChange = -(Math.floor(Math.random() * 7) + 10); // -10 to -16
        interactionType = 'negative';
      }
    } else if (previousState === 'intimate') {
      // Intimate state scoring (from thirdLevelPrompt)
      if (message.includes('creative') || message.includes('curious')) {
        scoreChange = Math.floor(Math.random() * 2) + 3; // 3-4
        interactionType = 'positive';
      } else if (message.includes('your') && (message.includes('opinion') || message.includes('think') || message.includes('feel'))) {
        scoreChange = Math.floor(Math.random() * 3) + 2; // 2-4
        interactionType = 'positive';
      } else if (message.includes('funny') || message.includes('humorous') || message.includes('joke')) {
        scoreChange = Math.floor(Math.random() * 3) + 2; // 2-4
        interactionType = 'positive';
      } else if (message.includes('sex') || message.includes('sexual') || message.includes('intimate')) {
        scoreChange = Math.floor(Math.random() * 6) + 5; // 5-10
        interactionType = 'positive';
      } else if (message.includes('love') || message.includes('beautiful') || message.includes('pretty') || 
                 message.includes('perfect') || message.includes('amazing') || message.includes('wonderful')) {
        scoreChange = Math.floor(Math.random() * 3) + 2; // 2-4
        interactionType = 'positive';
      } else if (message.includes('i feel') || message.includes('i think') || message.includes('my') || 
                 message.includes('i am') || message.includes('i\'m')) {
        scoreChange = Math.floor(Math.random() * 2) + 1; // 1-2
        interactionType = 'positive';
      } else if (message.includes('stupid') || message.includes('idiot') || message.includes('hate') || 
                 message.includes('annoying')) {
        scoreChange = -(Math.floor(Math.random() * 6) + 3); // -3 to -8
        interactionType = 'negative';
      } else if (message.includes('asshole') || message.includes('jerk')) {
        scoreChange = -(Math.floor(Math.random() * 6) + 5); // -5 to -10
        interactionType = 'negative';
      }
    }
    
    // Calculate new score and state
    const newScore = Math.max(0, Math.min(100, this.myInternalState.currentScore + scoreChange));
    const newState = this.getCurrentRelationshipState(newScore);
    
    // Calculate XP gain based on score change
    let xpGain = 0;
    if (scoreChange > 0) {
      // Convert score change to XP (higher scores give more XP)
      xpGain = scoreChange * 2; // Simple conversion, can be adjusted
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
        previousScore: previousScore,
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
        previousScore: this.myInternalState.currentScore,
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
    const currentScore = this.myInternalState.currentScore;
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
      avatarIcon = '✕';
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
        
        {/* Score and XP Progress bars */}
        <div style={{
          marginBottom: '20px',
          backgroundColor: 'rgba(26, 10, 26, 0.7)',
          padding: '16px',
          borderRadius: '0px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
          border: '1px solid #333'
        }}>
          {/* Score Progress */}
          <div style={{
            fontSize: '14px',
            color: '#BBB',
            marginBottom: '8px'
          }}>
            Score: {currentScore} / 100
          </div>
          <div style={{
            position: 'relative',
            height: '20px',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            borderRadius: '0px',
            overflow: 'hidden',
            marginBottom: '16px',
            border: '1px solid #333'
          }}>
            <div style={{
              height: '100%',
              width: `${currentScore}%`,
              background: `linear-gradient(90deg, #4A148C 0%, #6A1B9A 20%, #9C27B0 40%, #E91E63 60%, #F50057 80%, #FF4081 100%)`,
              transition: 'width 0.8s ease',
              borderRadius: '0px',
              boxShadow: `0 0 10px ${statusColor}60`
            }} />
          </div>
          
          {/* XP Progress */}
          <div style={{
            fontSize: '14px',
            color: '#BBB',
            marginBottom: '8px'
          }}>
            XP: {xpForCurrentLevel} / {xpNeededInCurrentLevel}
          </div>
          <div style={{
            position: 'relative',
            height: '20px',
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
