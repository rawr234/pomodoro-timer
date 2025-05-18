// Modified sound controls in renderer.js
document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const minutesElement = document.getElementById('minutes');
  const secondsElement = document.getElementById('seconds');
  const progressBar = document.getElementById('progress-bar');
  const sessionLabel = document.getElementById('session-label');
  const sessionCount = document.getElementById('session-count');
  const charizardAnimation = document.getElementById('charizard-animation');
  
  const startBtn = document.getElementById('start-btn');
  const pauseBtn = document.getElementById('pause-btn');
  const resetBtn = document.getElementById('reset-btn');
  
  const focusTimeInput = document.getElementById('focus-time');
  const shortBreakInput = document.getElementById('short-break');
  const longBreakInput = document.getElementById('long-break');
  const sessionsInput = document.getElementById('sessions');
  
  const minimizeBtn = document.getElementById('minimize-btn');
  const closeBtn = document.getElementById('close-btn');

  // Sound elements - FIX: Make sure we're getting these elements properly
  const soundToggle = document.getElementById('sound-toggle');
  const volumeSlider = document.getElementById('volume-slider');
  
  // Sound settings
  const soundSettings = {
    enabled: true,
    volume: 0.7 // Default volume (70%)
  };
  
  // Audio elements
  const clickSound = new Audio('assets/sounds/click.mp3');
  const alarmSound = new Audio('assets/sounds/alarm.mp3');
  const tickSound = new Audio('assets/sounds/tick.mp3');
  
  // Initialize sound settings from saved data
  window.electronAPI.getSoundSettings().then(settings => {
    soundSettings.enabled = settings.enabled;
    soundSettings.volume = settings.volume;
    
    // Update UI to match loaded settings
    soundToggle.checked = settings.enabled;
    volumeSlider.value = settings.volume * 100;
  }).catch(error => {
    console.error('Error loading sound settings:', error);
  });
  
  // Function to play sounds
  function playSound(audioElement, volumeMultiplier = 1.0) {
    if (!soundSettings.enabled) return;
    
    // Clone the audio element to allow for overlapping sounds
    const sound = audioElement.cloneNode();
    sound.volume = soundSettings.volume * volumeMultiplier;
    sound.play().catch(error => {
      console.error('Error playing sound:', error);
    });
  }
  
  // Play click sound function
  function playClickSound() {
    playSound(clickSound, 0.8);
  }
  
  // Play alarm sound function
  function playAlarmSound() {
    playSound(alarmSound, 1.0);
  }
  
  // Play tick sound function
  function playTickSound() {
    playSound(tickSound, 0.3);
  }
  
  // FIX: Simplified sound toggle handling
  // Sound toggle handler
  if (soundToggle) {
    // Add event listener directly to the checkbox
    soundToggle.addEventListener('change', () => {
      // Only play sound if toggling off (it was on before)
      if (soundSettings.enabled) {
        playClickSound();
      }
      
      // Update settings after playing sound if needed
      soundSettings.enabled = soundToggle.checked;
      window.electronAPI.saveSoundSettings(soundSettings);
    });
    
    // FIX: Add better touch target handling - make the entire toggle area clickable
    const toggleContainer = soundToggle.closest('.sound-toggle');
    if (toggleContainer) {
      toggleContainer.addEventListener('click', (e) => {
        // Don't trigger if clicking directly on the checkbox (let its natural behavior work)
        if (e.target !== soundToggle) {
          // Prevent default to avoid other click handlers
          e.preventDefault();
          // Toggle the checkbox
          soundToggle.checked = !soundToggle.checked;
          
          // Trigger the change event manually
          const event = new Event('change');
          soundToggle.dispatchEvent(event);
        }
      });
    }
  } else {
    console.error('Sound toggle element not found!');
  }
  
  // Volume slider handler
  if (volumeSlider) {
    volumeSlider.addEventListener('input', () => {
      soundSettings.volume = volumeSlider.value / 100;
      window.electronAPI.saveSoundSettings(soundSettings);
      
      // Play a test sound so user can hear volume change
      if (soundSettings.enabled && !volumeSlider.dragging) {
        playClickSound();
      }
    });
    
    // Prevent constant sound playing while dragging volume slider
    volumeSlider.addEventListener('mousedown', () => {
      volumeSlider.dragging = true;
    });
    
    volumeSlider.addEventListener('mouseup', () => {
      volumeSlider.dragging = false;
      if (soundSettings.enabled) {
        playClickSound();
      }
    });
  } else {
    console.error('Volume slider element not found!');
  }

  // Timer states
  const TIMER_STATES = {
    FOCUS: 'focus',
    SHORT_BREAK: 'shortBreak',
    LONG_BREAK: 'longBreak'
  };
  
  // Animation frames
  const totalFrames = 36; // We have 36 frames based on the folder content
  let currentFrame = 0;
  let animationInterval;
  
  // App state
  const state = {
    timerState: TIMER_STATES.FOCUS,
    isRunning: false,
    isPaused: false,
    timeLeft: 25 * 60, // 25 minutes in seconds
    totalTime: 25 * 60,
    currentSession: 1,
    intervalId: null
  };
  
  // Start the Charizard animation
  function startAnimation() {
    if (animationInterval) clearInterval(animationInterval);
    
    animationInterval = setInterval(() => {
      currentFrame = (currentFrame + 1) % totalFrames;
      // Format the frame number with leading zeros
      const frameNumber = currentFrame.toString().padStart(2, '0');
      charizardAnimation.src = `assets/frame_${frameNumber}_delay-0.06s.gif`;
    }, 60); // 60ms frame rate for fluid animation
  }
  
  // Update timer display
  function updateDisplay() {
    const minutes = Math.floor(state.timeLeft / 60);
    const seconds = state.timeLeft % 60;
    
    minutesElement.textContent = minutes.toString().padStart(2, '0');
    secondsElement.textContent = seconds.toString().padStart(2, '0');
    
    // Update progress bar
    const progress = ((state.totalTime - state.timeLeft) / state.totalTime) * 100;
    progressBar.style.width = `${progress}%`;
    
    // Update document title
    document.title = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} - FocusFlow`;
    
    // Set colors based on timer state
    updateColors();
  }
  
  // Update UI colors based on current timer state
  function updateColors() {
    document.body.className = state.timerState;
    
    // Update session label
    switch (state.timerState) {
      case TIMER_STATES.FOCUS:
        sessionLabel.textContent = 'Focus Session';
        break;
      case TIMER_STATES.SHORT_BREAK:
        sessionLabel.textContent = 'Short Break';
        break;
      case TIMER_STATES.LONG_BREAK:
        sessionLabel.textContent = 'Long Break';
        break;
    }
    
    sessionCount.textContent = `Session #${state.currentSession}`;
  }
  
  // Start timer
  function startTimer() {
    if (state.isRunning) return;
    
    state.isRunning = true;
    state.isPaused = false;
    
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    disableSettings(true);
    
    // Play click sound
    playClickSound();
    
    // Start interval
    state.intervalId = setInterval(() => {
      state.timeLeft--;
      updateDisplay();
      
      // Play tick sound every minute
      if (state.timeLeft > 0 && state.timeLeft % 60 === 0) {
        playTickSound();
      }
      
      if (state.timeLeft <= 0) {
        completeTimer();
      }
    }, 1000);
  }
  
  // Pause timer
  function pauseTimer() {
    if (!state.isRunning || state.isPaused) return;
    
    clearInterval(state.intervalId);
    state.isPaused = true;
    state.isRunning = false;
    
    startBtn.disabled = false;
    startBtn.textContent = 'Resume';
    
    // Play click sound
    playClickSound();
  }
  
  // Reset timer
  function resetTimer() {
    clearInterval(state.intervalId);
    
    state.isRunning = false;
    state.isPaused = false;
    
    setTimerForCurrentState();
    updateDisplay();
    
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    startBtn.textContent = 'Start';
    disableSettings(false);
    
    // Play click sound
    playClickSound();
  }
  
  // Complete current timer
  function completeTimer() {
    clearInterval(state.intervalId);
    state.isRunning = false;
    
    // Play alarm sound
    playAlarmSound();
    
    // Show notification
    let title, body;
    
    if (state.timerState === TIMER_STATES.FOCUS) {
      // Completed a focus session
      const sessionsUntilLongBreak = parseInt(sessionsInput.value);
      
      if (state.currentSession % sessionsUntilLongBreak === 0) {
        state.timerState = TIMER_STATES.LONG_BREAK;
        title = 'Time for a long break!';
        body = `You've completed ${sessionsUntilLongBreak} focus sessions. Take a well-deserved break.`;
      } else {
        state.timerState = TIMER_STATES.SHORT_BREAK;
        title = 'Time for a short break!';
        body = 'Good work! Take a quick break before the next focus session.';
      }
    } else {
      // Completed a break
      if (state.timerState === TIMER_STATES.LONG_BREAK) {
        title = 'Break complete!';
        body = 'Ready to start a new set of focus sessions?';
      } else {
        title = 'Break complete!';
        body = 'Time to focus again!';
        state.currentSession++; // Increment session counter after short break
      }
      state.timerState = TIMER_STATES.FOCUS;
    }
    
    window.electronAPI.showNotification({ title, body });
    
    // Reset for next timer
    setTimerForCurrentState();
    updateDisplay();
    
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    startBtn.textContent = 'Start';
    disableSettings(false);
  }
  
  // Set timer based on current state
  function setTimerForCurrentState() {
    switch (state.timerState) {
      case TIMER_STATES.FOCUS:
        state.totalTime = parseInt(focusTimeInput.value) * 60;
        break;
      case TIMER_STATES.SHORT_BREAK:
        state.totalTime = parseInt(shortBreakInput.value) * 60;
        break;
      case TIMER_STATES.LONG_BREAK:
        state.totalTime = parseInt(longBreakInput.value) * 60;
        break;
    }
    
    state.timeLeft = state.totalTime;
  }
  
  // Disable settings during timer
  function disableSettings(disabled) {
    focusTimeInput.disabled = disabled;
    shortBreakInput.disabled = disabled;
    longBreakInput.disabled = disabled;
    sessionsInput.disabled = disabled;
  }
  
  // Event listeners
  startBtn.addEventListener('click', () => {
    if (state.isPaused) {
      startBtn.textContent = 'Start';
    }
    startTimer();
  });
  
  pauseBtn.addEventListener('click', pauseTimer);
  resetBtn.addEventListener('click', resetTimer);
  
  // Settings change handlers
  focusTimeInput.addEventListener('change', () => {
    if (state.timerState === TIMER_STATES.FOCUS && !state.isRunning) {
      state.totalTime = parseInt(focusTimeInput.value) * 60;
      state.timeLeft = state.totalTime;
      updateDisplay();
      playClickSound();
    }
  });
  
  shortBreakInput.addEventListener('change', () => {
    if (state.timerState === TIMER_STATES.SHORT_BREAK && !state.isRunning) {
      state.totalTime = parseInt(shortBreakInput.value) * 60;
      state.timeLeft = state.totalTime;
      updateDisplay();
      playClickSound();
    }
  });
  
  longBreakInput.addEventListener('change', () => {
    if (state.timerState === TIMER_STATES.LONG_BREAK && !state.isRunning) {
      state.totalTime = parseInt(longBreakInput.value) * 60;
      state.timeLeft = state.totalTime;
      updateDisplay();
      playClickSound();
    }
  });
  
  // Number input buttons play click sound
  [focusTimeInput, shortBreakInput, longBreakInput, sessionsInput].forEach(input => {
    input.addEventListener('click', () => {
      playClickSound();
    });
  });
  
  // Window control buttons
  minimizeBtn.addEventListener('click', () => {
    window.electronAPI.minimizeWindow();
    playClickSound();
  });
  
  closeBtn.addEventListener('click', () => {
    window.electronAPI.closeWindow();
    playClickSound();
  });
  
  // Initialize the app
  setTimerForCurrentState();
  updateDisplay();
  
  // Start the Charizard animation immediately when app loads
  startAnimation();
  
  // FIX: Add debug logging to help troubleshoot
  console.log('Sound controls initialized:', {
    soundToggleExists: !!soundToggle,
    volumeSliderExists: !!volumeSlider,
    soundEnabled: soundSettings.enabled,
    volume: soundSettings.volume
  });
});