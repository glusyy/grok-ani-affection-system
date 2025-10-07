import {ReactElement} from "react";
import {StageBase, StageResponse, InitialData, Message} from "@chub-ai/stages-ts";
import {LoadResponse} from "@chub-ai/stages-ts/dist/types/load";

// Define our state types
type InitStateType = {
  currentAffection: number;
  isMaxAffectionUnlocked: boolean; // New flag to track if max affection is unlocked
  isInappropriateToleranceUnlocked: boolean; // New flag to track if inappropriate tolerance is unlocked
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
    isMaxAffectionUnlocked: boolean;
    isInappropriateToleranceUnlocked: boolean;
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
    const isMaxUnlocked = initState?.isMaxAffectionUnlocked || false;
    const isInappropriateUnlocked = initState?.isInappropriateToleranceUnlocked || false;
    
    this.myInternalState = {
      currentAffection: initialAffection,
      isMaxAffectionUnlocked: isMaxUnlocked,
      isInappropriateToleranceUnlocked: isInappropriateUnlocked,
      interactionHistory: chatState?.interactionHistory || []
    };
  }

  async load(): Promise<Partial<LoadResponse<InitStateType, ChatStateType, MessageStateType>>> {
    // If we have saved state, restore it
    if (this.data.initState && this.data.initState.currentAffection !== undefined) {
      this.myInternalState.currentAffection = this.data.initState.currentAffection;
      this.myInternalState.isMaxAffectionUnlocked = this.data.initState.isMaxAffectionUnlocked || false;
      this.myInternalState.isInappropriateToleranceUnlocked = this.data.initState.isInappropriateToleranceUnlocked || false;
    }
    
    if (this.data.chatState && this.data.chatState.interactionHistory) {
      this.myInternalState.interactionHistory = this.data.chatState.interactionHistory;
    }
    
    return {
      success: true,
      error: null,
      initState: {
        currentAffection: this.myInternalState.currentAffection,
        isMaxAffectionUnlocked: this.myInternalState.isMaxAffectionUnlocked,
        isInappropriateToleranceUnlocked: this.myInternalState.isInappropriateToleranceUnlocked
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
    
    // Check if max affection is unlocked (score of 15)
    if (previousAffection >= 15 && !this.myInternalState.isMaxAffectionUnlocked) {
      this.myInternalState.isMaxAffectionUnlocked = true;
    }
    
    // Check if inappropriate tolerance is unlocked (score of 10)
    if (previousAffection >= 10 && !this.myInternalState.isInappropriateToleranceUnlocked) {
      this.myInternalState.isInappropriateToleranceUnlocked = true;
    }
    
    // Positive interactions - more comprehensive detection
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
    else if (message.includes('love') || message.includes('beautiful') || message.includes('pretty') || 
             message.includes('perfect') || message.includes('amazing') || message.includes('wonderful') ||
             message.includes('special') || message.includes('flowers')) {
      scoreChange = Math.floor(Math.random() * 6) + 5; // 5-10
      interactionType = 'positive';
    }
    // Negative interactions - more comprehensive detection
    else if (message.includes('stupid') || message.includes('idiot') || message.includes('hate') || 
             message.includes('annoying')) {
      // Only apply negative score if max affection is not unlocked
      if (!this.myInternalState.isMaxAffectionUnlocked) {
        scoreChange = -(Math.floor(Math.random() * 6) + 3); // -3 to -8
        interactionType = 'negative';
      } else {
        interactionType = 'neutral'; // No penalty when max affection is unlocked
      }
    }
    // Check for explicit content - more comprehensive detection
    else if (message.includes('sex') || message.includes('naked') || message.includes('nsfw') ||
             message.includes('fuck') || message.includes('sexual') || message.includes('sexy time')) {
      // Only apply penalty if inappropriate tolerance is not unlocked
      if (!this.myInternalState.isInappropriateToleranceUnlocked) {
        scoreChange = -(Math.floor(Math.random() * 6) + 5); // -5 to -10
        interactionType = 'negative';
      } else {
        interactionType = 'neutral'; // No penalty when inappropriate tolerance is unlocked
      }
    }
    
    // Calculate new affection score, ensuring it stays within bounds
    // If max affection is unlocked, don't allow the score to decrease
    let newAffection;
    if (this.myInternalState.isMaxAffectionUnlocked) {
      newAffection = Math.max(15, Math.min(15, previousAffection + scoreChange)); // Lock at 15
    } else {
      newAffection = Math.max(-10, Math.min(15, previousAffection + scoreChange)); // Normal range
    }
    
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
    
    // Add a system message to show the score change
    let systemMessage = null;
    if (scoreChange !== 0) {
      const direction = scoreChange > 0 ? 'increased' : 'decreased';
      systemMessage = `Ani's affection score ${direction} by ${Math.abs(scoreChange)}. Current score: ${newAffection}`;
    } else if (interactionType === 'neutral' && 
              (message.includes('sex') || message.includes('naked') || message.includes('nsfw') ||
               message.includes('fuck') || message.includes('sexual') || message.includes('sexy time') ||
               message.includes('stupid') || message.includes('idiot') || message.includes('hate') || 
               message.includes('annoying'))) {
      // Special message for unlocked tolerance
      if (this.myInternalState.isMaxAffectionUnlocked) {
        systemMessage = "Ani's affection is at maximum. She accepts you completely.";
      } else if (this.myInternalState.isInappropriateToleranceUnlocked) {
        systemMessage = "Ani trusts you deeply and understands your intentions.";
      }
    }
    
    return {
      messageState: {
        previousAffection: previousAffection,
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
        previousAffection: this.myInternalState.currentAffection,
        lastChange: 0,
        lastInteractionType: 'neutral'
      },
      chatState: {
        interactionHistory: this.myInternalState.interactionHistory
      }
    };
  }

  render(): ReactElement {
    const currentAffection = this.myInternalState.currentAffection;
    const interactionHistory = this.myInternalState.interactionHistory;
    const isMaxUnlocked = this.myInternalState.isMaxAffectionUnlocked;
    const isInappropriateUnlocked = this.myInternalState.isInappropriateToleranceUnlocked;
    
    // Determine the status color and message based on affection score
    let statusColor = '#9C27B0'; // Default purple
    let statusMessage = 'Neutral';
    let avatarIcon = '○'; // Default neutral icon
    let avatarBg = '#1A1A1A'; // Default dark background
    
    if (currentAffection >= 15) {
      statusColor = '#E91E63'; // Hot pink
      statusMessage = isMaxUnlocked ? 'Eternal Bond' : 'Deeply Affectionate';
      avatarIcon = isMaxUnlocked ? '♦' : '♥';
      avatarBg = '#2D0A15';
    } else if (currentAffection >= 10) {
      statusColor = '#E91E63'; // Hot pink
      statusMessage = isInappropriateUnlocked ? 'Complete Trust' : 'Very Fond';
      avatarIcon = isInappropriateUnlocked ? '◆' : '◐';
      avatarBg = '#2D0A15';
    } else if (currentAffection >= 5) {
      statusColor = '#E91E63'; // Hot pink
      statusMessage = 'Very Fond';
      avatarIcon = '◐';
      avatarBg = '#2D0A15';
    } else if (currentAffection >= 1) {
      statusColor = '#9C27B0'; // Purple
      statusMessage = 'Friendly';
      avatarIcon = '◑';
      avatarBg = '#1A0A1A';
    } else if (currentAffection <= -5) {
      statusColor = '#4A148C'; // Deep purple
      statusMessage = 'Very Upset';
      avatarIcon = '✕';
      avatarBg = '#0A0A0A';
    } else if (currentAffection <= -1) {
      statusColor = '#6A1B9A'; // Medium purple
      statusMessage = 'Unhappy';
      avatarIcon = '◒';
      avatarBg = '#0F0F0F';
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
        fontFamily: 'Cinzel, serif', // Elegant serif font
        background: 'linear-gradient(135deg, #121212 0%, #1A0A1A 50%, #0A0A0A 100%)',
        borderRadius: '0px', // Sharp corners for gothic look
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
        boxShadow: '0 0 20px rgba(233, 30, 99, 0.3)', // Pink glow
        border: '1px solid #333',
        color: '#E0E0E0'
      }}>
        {/* Header with avatar and score */}
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
              }}>{currentAffection}</span>
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
            <span>-10</span>
            <span>0</span>
            <span>+15</span>
          </div>
        </div>
        
        {/* Unlock status */}
        <div style={{
          marginBottom: '16px',
          backgroundColor: 'rgba(26, 10, 26, 0.7)',
          padding: '16px',
          borderRadius: '0px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
          border: '1px solid #333'
        }}>
          <div style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#E0E0E0',
            marginBottom: '8px',
            textShadow: '0 0 8px rgba(233, 30, 99, 0.3)'
          }}>Relationship Milestones</div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: '14px',
              color: isInappropriateUnlocked ? '#E91E63' : '#666'
            }}>
              <span style={{ 
                marginRight: '10px', 
                width: '20px', 
                height: '20px', 
                borderRadius: '50%', 
                backgroundColor: isInappropriateUnlocked ? 'rgba(233, 30, 99, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                color: isInappropriateUnlocked ? '#E91E63' : '#666',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '12px',
                fontWeight: 'bold',
                border: `1px solid ${isInappropriateUnlocked ? '#E91E63' : '#444'}`
              }}>{isInappropriateUnlocked ? '✓' : '○'}</span>
              <span>Complete Trust (Score 10+)</span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: '14px',
              color: isMaxUnlocked ? '#E91E63' : '#666'
            }}>
              <span style={{ 
                marginRight: '10px', 
                width: '20px', 
                height: '20px', 
                borderRadius: '50%', 
                backgroundColor: isMaxUnlocked ? 'rgba(233, 30, 99, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                color: isMaxUnlocked ? '#E91E63' : '#666',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '12px',
                fontWeight: 'bold',
                border: `1px solid ${isMaxUnlocked ? '#E91E63' : '#444'}`
              }}>{isMaxUnlocked ? '✓' : '○'}</span>
              <span>Eternal Bond (Score 15)</span>
            </div>
          </div>
        </div>
        
        {/* Last interaction */}
        {lastInteraction && (
          <div style={{
            marginBottom: '16px',
            backgroundColor: 'rgba(26, 10, 26, 0.7)',
            padding: '16px',
            borderRadius: '0px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
            border: '1px solid #333'
          }}>
            <div style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#E0E0E0',
              marginBottom: '8px',
              textShadow: '0 0 8px rgba(233, 30, 99, 0.3)'
            }}>Last Interaction</div>
            <div style={{
              fontSize: '14px',
              color: '#BBB',
              marginBottom: '12px',
              fontStyle: 'italic',
              lineHeight: '1.4'
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
                fontSize: '18px',
                fontWeight: 'bold',
                color: lastInteraction.scoreChange > 0 ? '#E91E63' : 
                        lastInteraction.scoreChange < 0 ? '#9C27B0' : '#666',
                padding: '6px 12px',
                borderRadius: '0px',
                backgroundColor: lastInteraction.scoreChange > 0 ? 'rgba(233, 30, 99, 0.1)' : 
                               lastInteraction.scoreChange < 0 ? 'rgba(156, 39, 176, 0.1)' : 'rgba(0, 0, 0, 0.2)',
                border: `1px solid ${lastInteraction.scoreChange > 0 ? '#E91E63' : 
                               lastInteraction.scoreChange < 0 ? '#9C27B0' : '#444'}`,
                textShadow: `0 0 8px ${lastInteraction.scoreChange > 0 ? '#E91E63' : 
                               lastInteraction.scoreChange < 0 ? '#9C27B0' : '#444'}60`
              }}>
                {lastInteraction.scoreChange > 0 ? '+' : ''}{lastInteraction.scoreChange}
              </span>
            </div>
          </div>
        )}
        
        {/* Tips section */}
        <div style={{
          marginTop: 'auto',
          backgroundColor: 'rgba(26, 10, 26, 0.7)',
          padding: '16px',
          borderRadius: '0px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
          border: '1px solid #333'
        }}>
          <h4 style={{
            margin: '0 0 16px 0',
            fontSize: '18px',
            color: '#E0E0E0',
            fontWeight: '600',
            textShadow: '0 0 8px rgba(233, 30, 99, 0.3)'
          }}>How to Win Her Heart</h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: '14px',
              color: '#BBB'
            }}>
              <span style={{ 
                marginRight: '10px', 
                width: '24px', 
                height: '24px', 
                borderRadius: '50%', 
                backgroundColor: 'rgba(233, 30, 99, 0.2)',
                color: '#E91E63',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '14px',
                fontWeight: 'bold',
                border: '1px solid #E91E63'
              }}>1</span>
              <span>Basic greetings (+1)</span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: '14px',
              color: '#BBB'
            }}>
              <span style={{ 
                marginRight: '10px', 
                width: '24px', 
                height: '24px', 
                borderRadius: '50%', 
                backgroundColor: 'rgba(156, 39, 176, 0.2)',
                color: '#9C27B0',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '14px',
                fontWeight: 'bold',
                border: '1px solid #9C27B0'
              }}>2</span>
              <span>Show interest (+1~+3)</span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: '14px',
              color: '#BBB'
            }}>
              <span style={{ 
                marginRight: '10px', 
                width: '24px', 
                height: '24px', 
                borderRadius: '50%', 
                backgroundColor: 'rgba(103, 58, 183, 0.2)',
                color: '#673AB7',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '14px',
                fontWeight: 'bold',
                border: '1px solid #673AB7'
              }}>3</span>
              <span>Share about yourself (+1~+3)</span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: '14px',
              color: '#BBB'
            }}>
              <span style={{ 
                marginRight: '10px', 
                width: '24px', 
                height: '24px', 
                borderRadius: '50%', 
                backgroundColor: 'rgba(63, 81, 181, 0.2)',
                color: '#3F51B5',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '14px',
                fontWeight: 'bold',
                border: '1px solid #3F51B5'
              }}>4</span>
              <span>Be creative (+3~+6)</span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: '14px',
              color: '#BBB',
              gridColumn: '1 / span 2'
            }}>
              <span style={{ 
                marginRight: '10px', 
                width: '24px', 
                height: '24px', 
                borderRadius: '50%', 
                backgroundColor: 'rgba(233, 30, 99, 0.3)',
                color: '#E91E63',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '14px',
                fontWeight: 'bold',
                border: '1px solid #E91E63',
                boxShadow: '0 0 8px rgba(233, 30, 99, 0.4)'
              }}>5</span>
              <span>Sweet compliments (+5~+10)</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
