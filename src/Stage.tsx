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
    
    if (currentAffection >= 10) {
      statusColor = '#FF69B4'; // Deep pink
      statusMessage = 'Deeply Affectionate';
    } else if (currentAffection >= 5) {
      statusColor = '#FFB6C1'; // Light pink
      statusMessage = 'Very Fond';
    } else if (currentAffection >= 1) {
      statusColor = '#FFC0CB'; // Pink
      statusMessage = 'Friendly';
    } else if (currentAffection <= -5) {
      statusColor = '#8B0000'; // Dark red
      statusMessage = 'Very Upset';
    } else if (currentAffection <= -1) {
      statusColor = '#DC143C'; // Crimson
      statusMessage = 'Unhappy';
    }
    
    // Calculate percentage for the progress bar
    const percentage = ((currentAffection + 10) / 25) * 100;
    
    return (
      <div style={{
        width: '100%',
        height: '100%',
        padding: '16px',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h3 style={{
            margin: 0,
            color: '#333',
            fontSize: '18px'
          }}>Ani's Affection Score</h3>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <span style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#333'
            }}>{currentAffection}</span>
            <span style={{
              fontSize: '14px',
              fontWeight: 'bold',
              color: statusColor
            }}>{statusMessage}</span>
          </div>
        </div>
        
        <div style={{
          marginBottom: '16px'
        }}>
          <div style={{
            position: 'relative',
            height: '24px',
            backgroundColor: '#e0e0e0',
            borderRadius: '12px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${percentage}%`,
              backgroundColor: statusColor,
              transition: 'width 0.5s ease, background-color 0.5s ease'
            }} />
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0 8px'
            }}>
              <span style={{
                fontSize: '12px',
                color: '#333',
                fontWeight: 'bold'
              }}>-10</span>
              <span style={{
                fontSize: '12px',
                color: '#333',
                fontWeight: 'bold'
              }}>0</span>
              <span style={{
                fontSize: '12px',
                color: '#333',
                fontWeight: 'bold'
              }}>+15</span>
            </div>
          </div>
        </div>
        
        {interactionHistory.length > 0 && (
          <div style={{
            marginBottom: '16px'
          }}>
            <h4 style={{
              margin: '0 0 8px 0',
              fontSize: '16px',
              color: '#333'
            }}>Recent Interactions</h4>
            <div style={{
              margin: 0,
              padding: 0,
              listStyle: 'none'
            }}>
              {interactionHistory.slice(-5).reverse().map((item, index) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '4px 0',
                  borderBottom: '1px solid #e0e0e0'
                }}>
                  <span style={{
                    fontSize: '14px',
                    color: '#333',
                    flex: 1,
                    marginRight: '8px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {item.message.length > 30 ? item.message.substring(0, 30) + '...' : item.message}
                  </span>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: item.scoreChange > 0 ? '#4CAF50' : item.scoreChange < 0 ? '#F44336' : '#808080'
                  }}>
                    {item.scoreChange > 0 ? '+' : ''}{item.scoreChange}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div style={{
          marginTop: 'auto'
        }}>
          <h4 style={{
            margin: '0 0 8px 0',
            fontSize: '16px',
            color: '#333'
          }}>Tips to Increase Affection</h4>
          <ul style={{
            margin: 0,
            paddingLeft: '20px',
            fontSize: '14px',
            color: '#333'
          }}>
            <li>Basic greetings (+1)</li>
            <li>Show genuine interest (+1~+3)</li>
            <li>Share about yourself (+1~+3)</li>
            <li>Be friendly and creative (+3~+6)</li>
            <li>Give sweet compliments (+5~+10)</li>
          </ul>
        </div>
      </div>
    );
  }
}