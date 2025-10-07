import {ReactElement} from "react";
import {StageBase, StageResponse, InitialData, Message} from "@chub-ai/stages-ts";
import {LoadResponse} from "@chub-ai/stages-ts/dist/types/load";

// Define our state types
type InitStateType = {
  currentAffection: number;
};

type MessageStateType = {
  previousAffection: number;
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

// The main stage component
export class Stage extends StageBase<InitStateType, ChatStateType, MessageStateType, ConfigType> {
  
  // Internal state for the component
  myInternalState: {
    currentAffection: number;
    interactionHistory: Array<{
      message: string;
      scoreChange: number;
      timestamp: Date;
    }>;
  };

  constructor(data: InitialData<InitStateType, ChatStateType, MessageStateType, ConfigType>) {
    super(data);
    const {
        characters,         
        users,                  
        config,                                 
        messageState,                           
        environment,                     
        initState,                             
        chatState                              
    } = data;
    
    // Initialize with default affection score of 0 if not provided
    const initialAffection = initState?.currentAffection || 0;
    
    this.myInternalState = {
      currentAffection: initialAffection,
      interactionHistory: chatState?.interactionHistory || []
    };
  }

  async load(): Promise<Partial<LoadResponse<InitStateType, ChatStateType, MessageStateType>>> {
    return {
      success: true,
      error: null,
      initState: {
        currentAffection: this.myInternalState.currentAffection
      },
      chatState: {
        interactionHistory: this.myInternalState.interactionHistory
      }
    };
  }

  async setState(state: MessageStateType): Promise<void> {
    if (state != null) {
      this.myInternalState.currentAffection = state.previousAffection + state.lastChange;
    }
  }

  async beforePrompt(userMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
    const { content } = userMessage;
    const previousAffection = this.myInternalState.currentAffection;
    
    // Analyze the user message to determine affection change
    const message = content.toLowerCase();
    let scoreChange = 0;
    let interactionType: 'positive' | 'negative' | 'neutral' = 'neutral';
    
    // Positive interactions
    if (message.includes('hi') || message.includes('hello') || message.includes('how are you')) {
      scoreChange = 1;
      interactionType = 'positive';
    } 
    // Check for interest in Ani
    else if (message.includes('your') && (message.includes('opinion') || message.includes('think') || message.includes('feel'))) {
      scoreChange = Math.floor(Math.random() * 3) + 1; // 1-3
      interactionType = 'positive';
    }
    // Check for sharing personal information
    else if (message.includes('i feel') || message.includes('i think') || message.includes('my') || 
             message.includes('i am') || message.includes('i\'m')) {
      scoreChange = Math.floor(Math.random() * 3) + 1; // 1-3
      interactionType = 'positive';
    }
    // Check for friendly and creative tone
    else if (message.includes('cute') || message.includes('creative') || message.includes('interesting')) {
      scoreChange = Math.floor(Math.random() * 4) + 3; // 3-6
      interactionType = 'positive';
    }
    // Check for sweet compliments
    else if (message.includes('love') || message.includes('beautiful') || message.includes('perfect') || 
             message.includes('amazing') || message.includes('wonderful')) {
      scoreChange = Math.floor(Math.random() * 6) + 5; // 5-10
      interactionType = 'positive';
    }
    // Negative interactions
    else if (message.includes('stupid') || message.includes('idiot') || message.includes('hate') || 
             message.includes('annoying')) {
      scoreChange = -(Math.floor(Math.random() * 6) + 3); // -3 to -8
      interactionType = 'negative';
    }
    // Check for explicit content (basic detection)
    else if (message.includes('sex') || message.includes('naked') || message.includes('nsfw')) {
      scoreChange = -(Math.floor(Math.random() * 6) + 5); // -5 to -10
      interactionType = 'negative';
    }
    
    // Calculate new affection score, ensuring it stays within bounds
    const newAffection = Math.max(-10, Math.min(15, previousAffection + scoreChange));
    this.myInternalState.currentAffection = newAffection;
    
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
    
    return {
      messageState: {
        previousAffection: previousAffection,
        lastChange: scoreChange,
        lastInteractionType: interactionType
      },
      chatState: {
        interactionHistory: this.myInternalState.interactionHistory
      }
    };
  }

  async afterResponse(botMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
    // We don't need to modify the response, just pass through the state
    return {
      messageState: null,
      chatState: {
        interactionHistory: this.myInternalState.interactionHistory
      }
    };
  }

  render(): ReactElement {
    const currentAffection = this.myInternalState.currentAffection;
    const interactionHistory = this.myInternalState.interactionHistory;
    
    // Determine the status color and message based on affection score
    let statusColor = '#808080'; // Default gray
    let statusMessage = 'Neutral';
    let avatarIcon = '○'; // Default neutral icon
    
    if (currentAffection >= 10) {
      statusColor = '#FF1493'; // Deep pink
      statusMessage = 'Deeply Affectionate';
      avatarIcon = '♥';
    } else if (currentAffection >= 5) {
      statusColor = '#FF69B4'; // Medium pink
      statusMessage = 'Very Fond';
      avatarIcon = '◐';
    } else if (currentAffection >= 1) {
      statusColor = '#FFB6C1'; // Light pink
      statusMessage = 'Friendly';
      avatarIcon = '◑';
    } else if (currentAffection <= -5) {
      statusColor = '#8B0000'; // Dark red
      statusMessage = 'Very Upset';
      avatarIcon = '✕';
    } else if (currentAffection <= -1) {
      statusColor = '#DC143C'; // Crimson
      statusMessage = 'Unhappy';
      avatarIcon = '◒';
    }
    
    // Calculate percentage for the progress bar
    const percentage = ((currentAffection + 10) / 25) * 100;
    
    // Get the last interaction if available
    const lastInteraction = interactionHistory.length > 0 
      ? interactionHistory[interactionHistory.length - 1] 
      : null;
    
    return (
      <div style={{
        width: '100%',
        height: '100%',
        padding: '16px',
        fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%)',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Header with avatar and score */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '16px',
          backgroundColor: 'white',
          padding: '12px',
          borderRadius: '10px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: statusColor,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: '16px',
            fontSize: '32px',
            color: 'white',
            fontWeight: 'bold'
          }}>
            {avatarIcon}
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{
              margin: '0 0 4px 0',
              color: '#333',
              fontSize: '18px',
              fontWeight: '600'
            }}>Ani's Affection</h3>
            <div style={{
              display: 'flex',
              alignItems: 'center'
            }}>
              <span style={{
                fontSize: '28px',
                fontWeight: 'bold',
                color: statusColor,
                marginRight: '8px'
              }}>{currentAffection}</span>
              <span style={{
                fontSize: '16px',
                fontWeight: '500',
                color: statusColor
              }}>{statusMessage}</span>
            </div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div style={{
          marginBottom: '20px',
          backgroundColor: 'white',
          padding: '16px',
          borderRadius: '10px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{
            position: 'relative',
            height: '20px',
            backgroundColor: '#e0e0e0',
            borderRadius: '10px',
            overflow: 'hidden',
            marginBottom: '8px'
          }}>
            <div style={{
              height: '100%',
              width: `${percentage}%`,
              background: `linear-gradient(90deg, #8B0000 0%, #DC143C 20%, #808080 40%, #FFB6C1 60%, #FF69B4 80%, #FF1493 100%)`,
              backgroundSize: '200% 100%',
              backgroundPosition: `${Math.max(0, Math.min(100, percentage))}% 0`,
              transition: 'width 0.8s ease, background-position 0.8s ease',
              borderRadius: '10px'
            }} />
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: '#666'
          }}>
            <span>-10</span>
            <span>0</span>
            <span>+15</span>
          </div>
        </div>
        
        {/* Last interaction */}
        {lastInteraction && (
          <div style={{
            marginBottom: '16px',
            backgroundColor: 'white',
            padding: '12px',
            borderRadius: '10px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#333',
              marginBottom: '4px'
            }}>Last Interaction</div>
            <div style={{
              fontSize: '14px',
              color: '#555',
              marginBottom: '8px',
              fontStyle: 'italic'
            }}>
              "{lastInteraction.message.length > 50 
                ? lastInteraction.message.substring(0, 50) + '...' 
                : lastInteraction.message}"
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <span style={{
                fontSize: '16px',
                fontWeight: 'bold',
                color: lastInteraction.scoreChange > 0 ? '#4CAF50' : 
                        lastInteraction.scoreChange < 0 ? '#F44336' : '#808080',
                padding: '4px 8px',
                borderRadius: '4px',
                backgroundColor: lastInteraction.scoreChange > 0 ? 'rgba(76, 175, 80, 0.1)' : 
                               lastInteraction.scoreChange < 0 ? 'rgba(244, 67, 54, 0.1)' : 'rgba(128, 128, 128, 0.1)'
              }}>
                {lastInteraction.scoreChange > 0 ? '+' : ''}{lastInteraction.scoreChange}
              </span>
            </div>
          </div>
        )}
        
        {/* Tips section */}
        <div style={{
          marginTop: 'auto',
          backgroundColor: 'white',
          padding: '16px',
          borderRadius: '10px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
        }}>
          <h4 style={{
            margin: '0 0 12px 0',
            fontSize: '16px',
            color: '#333',
            fontWeight: '600'
          }}>How to Increase Affection</h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: '14px',
              color: '#333'
            }}>
              <span style={{ 
                marginRight: '8px', 
                width: '20px', 
                height: '20px', 
                borderRadius: '50%', 
                backgroundColor: '#4CAF50',
                color: 'white',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>1</span>
              <span>Basic greetings (+1)</span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: '14px',
              color: '#333'
            }}>
              <span style={{ 
                marginRight: '8px', 
                width: '20px', 
                height: '20px', 
                borderRadius: '50%', 
                backgroundColor: '#2196F3',
                color: 'white',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>2</span>
              <span>Show interest (+1~+3)</span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: '14px',
              color: '#333'
            }}>
              <span style={{ 
                marginRight: '8px', 
                width: '20px', 
                height: '20px', 
                borderRadius: '50%', 
                backgroundColor: '#9C27B0',
                color: 'white',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>3</span>
              <span>Share about yourself (+1~+3)</span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: '14px',
              color: '#333'
            }}>
              <span style={{ 
                marginRight: '8px', 
                width: '20px', 
                height: '20px', 
                borderRadius: '50%', 
                backgroundColor: '#FF9800',
                color: 'white',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>4</span>
              <span>Be creative (+3~+6)</span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: '14px',
              color: '#333',
              gridColumn: '1 / span 2'
            }}>
              <span style={{ 
                marginRight: '8px', 
                width: '20px', 
                height: '20px', 
                borderRadius: '50%', 
                backgroundColor: '#E91E63',
                color: 'white',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>5</span>
              <span>Sweet compliments (+5~+10)</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
