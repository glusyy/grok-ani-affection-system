import {ReactElement} from "react";
import {StageBase, StageResponse, InitialData, Message} from "@chub-ai/stages-ts";
import {LoadResponse} from "@chub-ai/stages-ts/dist/types/load";

// Define our state types
type InitStateType = {
  currentScore: number;
  currentState: string;
  isNSFWUnlocked: boolean;
};

type MessageStateType = {
  previousScore: number;
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
  { name: 'zero', minScore: 0, maxScore: 5, description: 'First Meeting' },
  { name: 'neutral', minScore: 6, maxScore: 35, description: 'Getting to Know' },
  { name: 'interested', minScore: 36, maxScore: 60, description: 'Building Connection' },
  { name: 'attracted', minScore: 61, maxScore: 75, description: 'Growing Attraction' },
  { name: 'intimate', minScore: 76, maxScore: 100, description: 'Deep Intimacy' }
];

// The main stage component
export class Stage extends StageBase<InitStateType, ChatStateType, MessageStateType, ConfigType> {
  
  // Store the initial data
  private initialData: InitialData<InitStateType, ChatStateType, MessageStateType, ConfigType>;
  
  // Internal state for the component
  myInternalState: {
    currentScore: number;
    currentState: string;
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
    const currentScore = initState?.currentScore || 6; // Start in neutral state
    const currentState = initState?.currentState || 'neutral';
    const isNSFWUnlocked = initState?.isNSFWUnlocked || false;
    
    this.myInternalState = {
      currentScore: currentScore,
      currentState: currentState,
      isNSFWUnlocked: isNSFWUnlocked,
      interactionHistory: chatState?.interactionHistory || []
    };
  }

  // Get current relationship state based on score
  getCurrentRelationshipState(score: number): string {
    for (const state of RELATIONSHIP_STATES) {
      if (score >= state.minScore && score <= state.maxScore) {
        return state.name;
      }
    }
    return 'neutral';
  }

  // Get state description
  getStateDescription(stateName: string): string {
    const state = RELATIONSHIP_STATES.find(s => s.name === stateName);
    return state ? state.description : 'Unknown';
  }

  async load(): Promise<Partial<LoadResponse<InitStateType, ChatStateType, MessageStateType>>> {
    // If we have saved state, restore it
    if (this.initialData.initState) {
      this.myInternalState.currentScore = this.initialData.initState.currentScore || 6;
      this.myInternalState.currentState = this.initialData.initState.currentState || 'neutral';
      this.myInternalState.isNSFWUnlocked = this.initialData.initState.isNSFWUnlocked || false;
    }
    
    if (this.initialData.chatState && this.initialData.chatState.interactionHistory) {
      this.myInternalState.interactionHistory = this.initialData.chatState.interactionHistory;
    }
    
    return {
      success: true,
      error: null,
      initState: {
        currentScore: this.myInternalState.currentScore,
        currentState: this.myInternalState.currentState,
        isNSFWUnlocked: this.myInternalState.isNSFWUnlocked
      },
      chatState: {
        interactionHistory: this.myInternalState.interactionHistory
      }
    };
  }

  async setState(state: MessageStateType): Promise<void> {
    if (state != null) {
      this.myInternalState.currentScore = state.previousScore;
      this.myInternalState.currentState = state.previousState;
    }
  }

  async beforePrompt(userMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
    const { content } = userMessage;
    const previousScore = this.myInternalState.currentScore;
    const previousState = this.myInternalState.currentState;
    
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
    
    // Check if NSFW should be unlocked (at attracted state)
    let isNSFWUnlocked = this.myInternalState.isNSFWUnlocked;
    if (newState === 'attracted' && !isNSFWUnlocked) {
      isNSFWUnlocked = true;
    }
    
    // Update internal state
    this.myInternalState.currentScore = newScore;
    this.myInternalState.currentState = newState;
    this.myInternalState.isNSFWUnlocked = isNSFWUnlocked;
    
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
      systemMessage = `Ani's affection ${direction} by ${Math.abs(scoreChange)}. Current state: ${this.getStateDescription(newState)}`;
    }
    
    // State change message
    if (newState !== previousState) {
      systemMessage = systemMessage ? `${systemMessage} RELATIONSHIP STATE CHANGED! Ani is now ${this.getStateDescription(newState)}!` : `RELATIONSHIP STATE CHANGED! Ani is now ${this.getStateDescription(newState)}!`;
      
      if (newState === 'attracted' && !this.myInternalState.isNSFWUnlocked) {
        systemMessage += " NSFW content is now unlocked!";
      }
    }
    
    return {
      messageState: {
        previousScore: previousScore,
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
    const currentState = this.myInternalState.currentState;
    const isNSFWUnlocked = this.myInternalState.isNSFWUnlocked;
    
    // Determine the status color and message based on state
    let statusColor = '#9C27B0'; // Default purple
    let statusMessage = this.getStateDescription(currentState);
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
    
    // Calculate progress percentage within current state
    const currentStateData = RELATIONSHIP_STATES.find(s => s.name === currentState);
    const stateMinScore = currentStateData ? currentStateData.minScore : 0;
    const stateMaxScore = currentStateData ? currentStateData.maxScore : 100;
    const stateRange = stateMaxScore - stateMinScore;
    const currentProgress = currentScore - stateMinScore;
    const percentage = stateRange > 0 ? (currentProgress / stateRange) * 100 : 100;
    
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
        {/* Header with avatar and state */}
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
              }}>{currentScore}</span>
              <span style={{
                fontSize: '16px',
                fontWeight: '500',
                color: statusColor,
                textShadow: `0 0 8px ${statusColor}60`
              }}>{statusMessage}</span>
            </div>
          </div>
        </div>
        
        {/* Progress bar */}
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
            Score: {currentProgress} / {stateRange}
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
            <span>Zero</span>
            <span>Neutral</span>
            <span>Interested</span>
            <span style={{ color: isNSFWUnlocked ? '#E91E63' : '#BBB' }}>Attracted (NSFW)</span>
            <span>Intimate</span>
          </div>
        </div>
      </div>
    );
  }
}
