import { useState, useEffect } from 'react';
import './App.css';

// Constants
const TIME_OPTIONS = ['Morning', 'Afternoon', 'Evening'];
const PRIORITY_OPTIONS = ['High', 'Medium', 'Low'];
const CATEGORY_OPTIONS = ['Work', 'Study', 'Health', 'Personal', 'Other'];
const FILTERS = ['All', ...TIME_OPTIONS, ...PRIORITY_OPTIONS];

const TIME_WEIGHTS = { 'Morning': 1, 'Afternoon': 2, 'Evening': 3 };
const PRIORITY_WEIGHTS = { 'High': 1, 'Medium': 2, 'Low': 3 };

function App() {
  // --- STATE ---
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('daily_tasks');
    return saved ? JSON.parse(saved) : [];
  });
  const [taskName, setTaskName] = useState('');
  const [selectedTime, setSelectedTime] = useState('Morning');
  const [selectedPriority, setSelectedPriority] = useState('Medium');
  const [selectedCategory, setSelectedCategory] = useState('Work');
  
  const [activeFilter, setActiveFilter] = useState('All');
  
  const [toasts, setToasts] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('daily_theme') === 'dark';
  });
  
  const [isSaving, setIsSaving] = useState(false);

  // --- EFFECTS ---
  
  // 3. User Control + Aesthetic-Usability Effect — Dark mode effect
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('daily_theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('daily_theme', 'light');
    }
  }, [isDarkMode]);

  // 2. Error Prevention + User Confidence — Save to localStorage
  useEffect(() => {
    localStorage.setItem('daily_tasks', JSON.stringify(tasks));
    setIsSaving(true);
    const timer = setTimeout(() => setIsSaving(false), 1000);
    return () => clearTimeout(timer);
  }, [tasks]);

  // --- HANDLERS ---
  
  const showToast = (message, type, action = null) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type, action }]);
    
    // Auto remove toast
    setTimeout(() => {
      setToasts((prev) => prev.filter(t => t.id !== id));
    }, 5000); 
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleAddTask = () => {
    if (!taskName.trim()) {
      showToast('Please enter a task name', 'error');
      return;
    }

    const newTask = {
      id: Date.now(),
      name: taskName.trim(),
      time: selectedTime,
      priority: selectedPriority,
      category: selectedCategory,
      completed: false
    };

    setTasks(prev => [...prev, newTask]);
    setTaskName('');
    showToast('Task added successfully!', 'success');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAddTask();
  };

  const toggleTaskCompletion = (id) => {
    setTasks(prev => prev.map(t => 
      t.id === id ? { ...t, completed: !t.completed } : t
    ));
  };

  // 6. Error Recovery (Nielsen's Heuristic #5) — Undo delete
  const handleDeleteTask = (taskToDelete) => {
    setTasks(prev => prev.filter(t => t.id !== taskToDelete.id));
    
    showToast('Task deleted', 'undo', {
      label: 'Undo',
      onClick: (toastId) => {
        setTasks(prev => [...prev, taskToDelete]);
        removeToast(toastId);
      }
    });
  };

  // 8. Error Prevention + Undo Workflow — Clear all
  const handleClearAll = () => {
    const backupTasks = [...tasks];
    setTasks([]);
    showToast(`All ${backupTasks.length} tasks cleared`, 'undo', {
      label: 'Undo',
      onClick: (toastId) => {
        setTasks(backupTasks);
        removeToast(toastId);
      }
    });
  };

  // 9. Learnability + Real-world utility — Copy to clipboard
  const handleExport = async () => {
    const { dateString } = getGreetingContext();
    let text = `My Day — ${dateString}\n─────────────────────\n`;
    
    const sorted = getSortedTasks();
    sorted.forEach(t => {
      const status = t.completed ? '[x]' : '[ ]';
      text += `${status} ${t.name} — ${t.time} (${t.priority} priority, ${t.category})\n`;
    });
    
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied to clipboard!', 'success');
    } catch(e) {
      showToast('Failed to copy', 'error');
    }
  };

  // --- STATS & LOGIC ---

  const stats = {
    high: tasks.filter(t => t.priority === 'High').length,
    medium: tasks.filter(t => t.priority === 'Medium').length,
    low: tasks.filter(t => t.priority === 'Low').length,
    completed: tasks.filter(t => t.completed).length,
    total: tasks.length
  };

  // 7. User-Centered Design + Personalization — Dynamic Greeting
  const getGreetingContext = () => {
    const hour = new Date().getHours();
    let greeting = "";
    if (hour >= 5 && hour < 12) greeting = "Good morning!";
    else if (hour >= 12 && hour < 17) greeting = "Good afternoon!";
    else if (hour >= 17 && hour < 21) greeting = "Good evening!";
    else greeting = "Working late?";
    
    const dateOptions = { weekday: 'long', month: 'long', day: 'numeric' };
    const dateString = new Date().toLocaleDateString('en-US', dateOptions);
    return { greeting, dateString };
  };

  const { greeting, dateString } = getGreetingContext();

  const getSmartSuggestion = () => {
    if (stats.high >= 3) return { text: "Too many high priority tasks — consider balancing", type: 'suggestion-amber' };
    if (tasks.length >= 4) return { text: "Take a short break after completing 2-3 tasks", type: 'suggestion-teal' };
    if (tasks.length > 0) return { text: "Start with high priority tasks", type: 'suggestion-blue' };
    return null;
  };

  const suggestion = getSmartSuggestion();
  const progressPercent = tasks.length === 0 ? 0 : Math.min((stats.completed / tasks.length) * 100, 100);

  // Sorting and Filtering
  const getSortedTasks = () => {
    let filtered = tasks;
    
    // 4. Hick's Law + Visibility — Apply filters
    if (activeFilter !== 'All') {
      if (TIME_OPTIONS.includes(activeFilter)) filtered = filtered.filter(t => t.time === activeFilter);
      if (PRIORITY_OPTIONS.includes(activeFilter)) filtered = filtered.filter(t => t.priority === activeFilter);
    }

    return filtered.sort((a, b) => {
      // 1. Feedback + User Control — Completed to bottom
      if (a.completed && !b.completed) return 1;
      if (!a.completed && b.completed) return -1;
      
      if (TIME_WEIGHTS[a.time] !== TIME_WEIGHTS[b.time]) {
        return TIME_WEIGHTS[a.time] - TIME_WEIGHTS[b.time];
      }
      return PRIORITY_WEIGHTS[a.priority] - PRIORITY_WEIGHTS[b.priority];
    });
  };

  const displayTasks = getSortedTasks();

  // Chart computations
  const getChartData = () => {
    const t = stats.total || 1; // prevent divide by zero
    const morningCount = tasks.filter(t => t.time === 'Morning').length;
    const afternoonCount = tasks.filter(t => t.time === 'Afternoon').length;
    const eveningCount = tasks.filter(t => t.time === 'Evening').length;
    
    return {
      morningPct: (morningCount / t) * 100,
      afternoonPct: (afternoonCount / t) * 100,
      eveningPct: (eveningCount / t) * 100,
      morningCount,
      afternoonCount,
      eveningCount
    };
  };
  const chartData = getChartData();

  const getFilterCount = (filterName) => {
    if (filterName === 'All') return tasks.length;
    if (TIME_OPTIONS.includes(filterName)) return tasks.filter(t => t.time === filterName).length;
    if (PRIORITY_OPTIONS.includes(filterName)) return tasks.filter(t => t.priority === filterName).length;
    return 0;
  };

  return (
    <div className="app-container">
      {/* Auto Save Alert */}
      <div className={`save-indicator ${isSaving ? 'saving' : ''}`}>
        <span className="dot"></span> Auto-saved
      </div>

      <header className="hero-header">
        <div className="header-top">
          <span className="header-date">{dateString}</span>
          <button 
            className="theme-toggle-btn" 
            onClick={() => setIsDarkMode(!isDarkMode)}
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
        
        <div className="header-content">
          <span className="badge">Smart Day Planner</span>
          <h1>{greeting}</h1>
          <p className="subtitle">Plan your day in seconds</p>
        </div>
      </header>

      {/* STATS ROW */}
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-number high">{stats.high}</span>
          <span className="stat-label">High</span>
        </div>
        <div className="stat-card">
          <span className="stat-number medium">{stats.medium}</span>
          <span className="stat-label">Medium</span>
        </div>
        <div className="stat-card">
          <span className="stat-number low">{stats.low}</span>
          <span className="stat-label">Low</span>
        </div>
        {/* 1. Feedback + User Control — Completion Stat */}
        <div className="stat-card">
          <span className="stat-number completed">{stats.completed}</span>
          <span className="stat-label">Completed ({tasks.length})</span>
        </div>
      </div>

      {/* ADD TASK FORM */}
      <div className="card">
        <div className="form-group">
          <label className="form-label">What do you need to do?</label>
          <input 
            type="text" 
            className="text-input" 
            placeholder="e.g., Read technical docs..."
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Time</label>
          <div className="toggle-group">
            {TIME_OPTIONS.map(opt => (
               <button 
                key={opt}
                className={`toggle-btn ${selectedTime === opt ? 'time-active' : ''}`}
                onClick={() => setSelectedTime(opt)}
               >
                 {opt}
               </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Priority</label>
          <div className="toggle-group">
            {PRIORITY_OPTIONS.map(opt => (
              <button 
                key={opt}
                className={`toggle-btn ${selectedPriority === opt ? `priority-${opt.toLowerCase()} active` : ''}`}
                onClick={() => setSelectedPriority(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* 5. Law of Similarity + Proximity — Categories */}
        <div className="form-group">
          <label className="form-label">Category</label>
          <div className="toggle-group">
            {CATEGORY_OPTIONS.map(opt => (
              <button 
                key={opt}
                className={`toggle-btn ${selectedCategory === opt ? 'category-active' : ''}`}
                onClick={() => setSelectedCategory(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <button className="submit-btn" onClick={handleAddTask}>
          Add Task
        </button>
      </div>

      {/* SMART SUGGESTIONS */}
      {suggestion && (
        <div className={`suggestion-banner ${suggestion.type}`}>
          <span className="suggestion-icon">💡</span>
          {suggestion.text}
        </div>
      )}

      {/* TASK LIST */}
      <div className="card task-list-card">
        <div className="progress-container">
          <div className="list-header">
            <span className="list-header-title">Daily Progress ({Math.round(progressPercent)}%)</span>
            {tasks.length > 0 && (
              <button className="export-btn" onClick={handleExport}>
                ⎘ Copy list
              </button>
            )}
          </div>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>

        {/* 4. Hick's Law + Visibility — Filter Bar */}
        {tasks.length > 0 && (
          <div className="filter-bar">
            {FILTERS.map(f => {
              const fCount = getFilterCount(f);
              return (
                <button 
                  key={f} 
                  className={`filter-btn ${activeFilter === f ? 'active' : ''}`}
                  onClick={() => setActiveFilter(f)}
                >
                  {f} {fCount !== 0 && `(${fCount})`}
                </button>
              )
            })}
          </div>
        )}

        <div className="task-list-container">
          {displayTasks.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📝</span>
              <p>No tasks found</p>
            </div>
          ) : (
            displayTasks.map(task => (
              <div key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
                <div className={`task-accent accent-${task.priority.toLowerCase()}`}></div>
                <div className="task-content">
                  {/* 1. Feedback + User Control — Checkbox */}
                  <button 
                    className="checkbox-btn" 
                    onClick={() => toggleTaskCompletion(task.id)}
                    aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
                  >
                    ✓
                  </button>
                  <span className="task-name">{task.name}</span>
                  <div className="task-tags">
                    <span className="tag tag-time">{task.time}</span>
                    <span className={`tag tag-${task.priority.toLowerCase()}`}>{task.priority}</span>
                    <span className={`tag tag-cat-${task.category.toLowerCase()}`}>{task.category}</span>
                  </div>
                  <button className="delete-btn" onClick={() => handleDeleteTask(task)}>
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 8. Error Prevention + Confirmation Dialogue — Clear flow */}
        {tasks.length > 0 && (
          <div className="clear-all-container">
            <button className="clear-all-btn" onClick={handleClearAll}>
              Clear All Tasks
            </button>
          </div>
        )}
      </div>

      {/* 10. Visual Feedback + Mental Model — Mini Chart */}
      {tasks.length > 0 && (
        <div className="chart-card">
          <div className="chart-title">Tasks by Time of Day</div>
          <div className="chart-bars-wrapper">
            {chartData.morningPct > 0 && (
              <div className="chart-segment chart-segment-morning" style={{ width: `${chartData.morningPct}%` }}>
                {chartData.morningPct > 10 ? chartData.morningCount : ''}
              </div>
            )}
            {chartData.afternoonPct > 0 && (
              <div className="chart-segment chart-segment-afternoon" style={{ width: `${chartData.afternoonPct}%` }}>
                {chartData.afternoonPct > 10 ? chartData.afternoonCount : ''}
              </div>
            )}
            {chartData.eveningPct > 0 && (
              <div className="chart-segment chart-segment-evening" style={{ width: `${chartData.eveningPct}%` }}>
                {chartData.eveningPct > 10 ? chartData.eveningCount : ''}
              </div>
            )}
          </div>
          <div className="chart-legend">
            <div className="legend-item">
              <span className="legend-dot dot-morning"></span> Morning
            </div>
            <div className="legend-item">
              <span className="legend-dot dot-afternoon"></span> Afternoon
            </div>
            <div className="legend-item">
              <span className="legend-dot dot-evening"></span> Evening
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATIONS */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <span>{toast.message}</span>
            {toast.action && (
              <button 
                className="toast-action-btn"
                onClick={() => toast.action.onClick(toast.id)}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
