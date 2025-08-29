import React, { useEffect, useMemo, useState } from "react";
import { 
  Activity, 
  AlertCircle, 
  Brain, 
  Users, 
  Video, 
  Plus, 
  Search, 
  MessageSquare, 
  Settings,
  Send,
  BarChart3,
  Shield,
  Headphones,
  Play,
  Pause,
  TrendingUp
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from "recharts";

// Mock Data
const STUDENT_NAMES = [
  "Aarav", "Isha", "Vihaan", "Diya", "Kabir", "Anaya", "Advait", "Myra", 
  "Reyansh", "Sara", "Vivaan", "Aadhya", "Arjun", "Zara", "Ira", "Rohan"
];

const TOPICS = [
  "Calculus: Limits", "OS: Deadlocks", "DBMS: Normalization", "DSA: Graphs",
  "ML: Overfitting", "Physics: SHM", "Chemistry: Titration", "Economics: Elasticity"
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateStudents(count = 16) {
  return Array.from({ length: count }).map((_, i) => ({
    id: i + 1,
    name: STUDENT_NAMES[i % STUDENT_NAMES.length] + ` ${Math.floor(i/STUDENT_NAMES.length) + 1}`,
    topic: TOPICS[i % TOPICS.length],
    attention: randomInt(40, 95),
    confusion: randomInt(0, 40),
    speaking: Math.random() < 0.15,
    handRaised: Math.random() < 0.1,
    inPeerNode: false,
    peerNodeName: null,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(STUDENT_NAMES[i % STUDENT_NAMES.length])}`
  }));
}

function generateEngagementData() {
  return Array.from({ length: 30 }).map((_, i) => ({
    time: i,
    engagement: randomInt(50, 85),
    confusion: randomInt(10, 30)
  }));
}

// Helper Components
function StatCard({ icon, label, value, color }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200'
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function StudentCard({ student, selected, onToggleSelect }) {
  const getStatusColor = (confusion) => {
    if (confusion >= 50) return 'border-red-200 bg-red-50';
    if (confusion >= 30) return 'border-yellow-200 bg-yellow-50';
    return 'border-green-200 bg-green-50';
  };

  return (
    <div className={`p-4 rounded-xl border-2 transition-all ${
      selected ? 'border-blue-500 bg-blue-50' : `${getStatusColor(student.confusion)} hover:shadow-md`
    }`}>
      <div className="flex items-center gap-3">
        <img 
          src={student.avatar} 
          alt={student.name}
          className="w-12 h-12 rounded-full border-2 border-white shadow-sm"
        />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{student.name}</h3>
            <div className="flex items-center gap-2">
              {student.inPeerNode && (
                <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full">
                  In Node
                </span>
              )}
              {student.speaking && (
                <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">
                  Speaking
                </span>
              )}
              {student.handRaised && (
                <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full">
                  ✋ Hand Raised
                </span>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-2">{student.topic}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs">
              <span>Attention: {student.attention}%</span>
              <span className={`font-medium ${
                student.confusion >= 30 ? 'text-red-600' : 'text-green-600'
              }`}>
                Confusion: {student.confusion}%
              </span>
            </div>
            {!student.inPeerNode && (
              <button
                onClick={() => onToggleSelect(student.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  selected 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {selected ? 'Selected' : 'Select'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HiveMindDashboard() {
  // Core state
  const [connected, setConnected] = useState(false);
  const [students, setStudents] = useState(() => generateStudents(16));
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [engagementData] = useState(() => generateEngagementData());

  // Attentiveness value from backend
  const [overallAttentiveness, setOverallAttentiveness] = useState(null);

  // Move screenStream, videoRef, canvasRef here (before useEffect)
  const [screenStream, setScreenStream] = useState(null);
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);

  useEffect(() => {
    let intervalId;
    async function fetchAttentiveness() {
      try {
        let frameData = '';
        if (videoRef.current && canvasRef.current && screenStream) {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 360;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          frameData = canvas.toDataURL('image/jpeg');
        }
        const response = await fetch('http://localhost:8000/process_frame', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ frame: frameData })
        });
        const result = await response.json();
        if (result.status === 'ok') {
          setOverallAttentiveness(result.overall_concentration ?? '-');
        } else {
          setOverallAttentiveness('-');
        }
      } catch (err) {
        setOverallAttentiveness('-');
      }
    }
    if (connected) {
      fetchAttentiveness();
      intervalId = setInterval(fetchAttentiveness, 3000);
    }
    return () => clearInterval(intervalId);
  }, [connected, screenStream]);
  
  // UI state
  const [activeTab, setActiveTab] = useState("overview");
  const [showCreateNode, setShowCreateNode] = useState(false);
  const [nodeName, setNodeName] = useState("");
  const [coachMessage, setCoachMessage] = useState("");
  const [notifications, setNotifications] = useState([]);
  
  // Settings
  const [autoDetection, setAutoDetection] = useState(true);
  const [apiKeys, setApiKeys] = useState({ openai: "", perplexity: "" });
  
  // Computed values
  const strugglingStudents = useMemo(() => 
    students.filter(s => s.confusion >= 30 && !s.inPeerNode), 
    [students]
  );
  
  const filteredStudents = useMemo(() => 
    students.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.topic.toLowerCase().includes(searchTerm.toLowerCase())
    ), 
    [students, searchTerm]
  );
  
  const peerNodes = useMemo(() => {
    const nodes = {};
    students.filter(s => s.inPeerNode).forEach(s => {
      if (!nodes[s.peerNodeName]) {
        nodes[s.peerNodeName] = [];
      }
      nodes[s.peerNodeName].push(s);
    });
    return Object.entries(nodes).map(([name, members]) => ({ name, members }));
  }, [students]);

  // Simulate real-time updates
  useEffect(() => {
    if (!connected) return;
    
    const interval = setInterval(() => {
      setStudents(prev => prev.map(student => ({
        ...student,
        attention: Math.max(20, Math.min(100, student.attention + randomInt(-5, 5))),
        confusion: Math.max(0, Math.min(100, student.confusion + randomInt(-3, 4))),
        speaking: Math.random() < 0.05 ? !student.speaking : student.speaking,
        handRaised: Math.random() < 0.03 ? !student.handRaised : student.handRaised
      })));
    }, 2000);
    
    return () => clearInterval(interval);
  }, [connected]);

  // Add notification for new struggling students
  useEffect(() => {
    if (connected && autoDetection) {
      const newStruggling = strugglingStudents.filter(s => s.confusion >= 40);
      if (newStruggling.length > 0) {
        setNotifications(prev => [...prev.slice(-4), {
          id: Date.now(),
          type: 'alert',
          message: `${newStruggling.length} student(s) showing high confusion levels`,
          timestamp: new Date().toLocaleTimeString()
        }]);
      }
    }
  }, [strugglingStudents, connected, autoDetection]);

  // Actions
  const connectToZoom = () => {
  setConnected(true);
  addNotification('success', 'Connected to Zoom session (Demo Mode)');
  startScreenRecording();
  };

  const disconnectZoom = () => {
    setConnected(false);
    setStudents(generateStudents(16));
    setSelectedStudents([]);
    addNotification('info', 'Disconnected from Zoom session');
  };

  const addNotification = (type, message) => {
    setNotifications(prev => [...prev.slice(-4), {
      id: Date.now(),
      type,
      message,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const createPeerNode = () => {
    if (!nodeName.trim() || selectedStudents.length === 0) {
      addNotification('error', 'Please enter a node name and select students');
      return;
    }

    setStudents(prev => prev.map(student => 
      selectedStudents.includes(student.id)
        ? { ...student, inPeerNode: true, peerNodeName: nodeName.trim() }
        : student
    ));

    addNotification('success', `Created peer node "${nodeName}" with ${selectedStudents.length} students`);
    setNodeName("");
    setSelectedStudents([]);
    setShowCreateNode(false);
  };

  const sendCoachMessage = () => {
    if (!coachMessage.trim()) return;
    
    addNotification('info', `Coach message sent: ${coachMessage.slice(0, 50)}...`);
    setCoachMessage("");
  };

  const runAIAnalysis = () => {
    addNotification('info', 'Running AI analysis...');
    setTimeout(() => {
      setStudents(prev => prev.map(s => ({
        ...s,
        confusion: Math.min(100, s.confusion + randomInt(0, 15))
      })));
      addNotification('success', 'AI analysis completed - flagged struggling students');
    }, 1500);
  };

  // Cleanup stream on disconnect
  useEffect(() => {
    if (!connected && screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }
  }, [connected, screenStream]);

  // Handler to start screen recording
  const startScreenRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" },
        audio: false
      });
      setScreenStream(stream);
    } catch (err) {
      addNotification('error', 'Screen recording permission denied or cancelled');
    }
  };

  // Handler to stop screen recording
  // Removed unused stopScreenRecording function

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                HiveMind
              </h1>
              <p className="text-xs text-gray-500">AI-Powered Learning Assistant</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 ${
              connected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}>
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              {connected ? 'Zoom Connected' : 'Disconnected'}
            </div>
            
            <button 
              onClick={connected ? disconnectZoom : connectToZoom}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 flex items-center gap-2"
            >
              {connected ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {connected ? 'Reset Demo' : 'Connect Zoom'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatCard 
            icon={<Users className="w-5 h-5" />}
            label="Total Students"
            value={students.length}
            color="blue"
          />
          <StatCard 
            icon={<AlertCircle className="w-5 h-5" />}
            label="Need Support"
            value={strugglingStudents.length}
            color="red"
          />
          <StatCard 
            icon={<Headphones className="w-5 h-5" />}
            label="In Peer Nodes"
            value={students.filter(s => s.inPeerNode).length}
            color="green"
          />
          <StatCard 
            icon={<TrendingUp className="w-5 h-5" />}
            label="Avg Engagement"
            value={`${Math.round(students.reduce((sum, s) => sum + s.attention, 0) / students.length)}%`}
            color="purple"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-8 space-y-6">
            {/* Engagement Chart */}
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  Class Engagement Overview
                </h3>
                <button 
                  onClick={runAIAnalysis}
                  className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm flex items-center gap-1"
                >
                  <BarChart3 className="w-4 h-4" />
                  Run AI Analysis
                </button>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={engagementData}>
                    <defs>
                      <linearGradient id="engagementGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" hide />
                    <YAxis domain={[0, 100]} />
                    <Area 
                      type="monotone" 
                      dataKey="engagement" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      fill="url(#engagementGradient)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="flex border-b">
                {[
                  { id: 'overview', label: 'Student Overview', icon: Users },
                  { id: 'coach', label: 'Coach Console', icon: MessageSquare },
                  { id: 'settings', label: 'Settings', icon: Settings }
                ].map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-6 py-3 flex items-center gap-2 font-medium transition-colors ${
                        activeTab === tab.id 
                          ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' 
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search students by name or topic..."
                          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <button 
                        onClick={() => setShowCreateNode(true)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Create Peer Node
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredStudents.map(student => (
                        <StudentCard 
                          key={student.id}
                          student={student}
                          selected={selectedStudents.includes(student.id)}
                          onToggleSelect={toggleStudentSelection}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'coach' && (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Broadcast Message</h3>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Send encouragement, hints, or resources to the class..."
                          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={coachMessage}
                          onChange={(e) => setCoachMessage(e.target.value)}
                        />
                        <button 
                          onClick={sendCoachMessage}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                          <Send className="w-4 h-4" />
                          Send
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gray-50 rounded-xl p-4">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Shield className="w-4 h-4 text-green-600" />
                          Privacy & Ethics
                        </h4>
                        <ul className="text-sm text-gray-600 space-y-2">
                          <li>• Only engagement signals analyzed (no biometrics)</li>
                          <li>• Student consent required for all data collection</li>
                          <li>• Data processed locally when possible</li>
                          <li>• Anonymous aggregation for insights</li>
                        </ul>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-4">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-purple-600" />
                          Session Impact
                        </h4>
                        <div className="text-sm text-gray-600 space-y-2">
                          <div className="flex justify-between">
                            <span>Questions Resolved:</span>
                            <span className="font-medium">78%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Student Participation:</span>
                            <span className="font-medium">+23%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Peer Collaboration:</span>
                            <span className="font-medium">{peerNodes.length} nodes</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'settings' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">AI Configuration</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">OpenAI API Key</label>
                          <input
                            type="password"
                            placeholder="sk-..."
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={apiKeys.openai}
                            onChange={(e) => setApiKeys(prev => ({...prev, openai: e.target.value}))}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Perplexity API Key</label>
                          <input
                            type="password"
                            placeholder="pplx-..."
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={apiKeys.perplexity}
                            onChange={(e) => setApiKeys(prev => ({...prev, perplexity: e.target.value}))}
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="autoDetect"
                            checked={autoDetection}
                            onChange={(e) => setAutoDetection(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="autoDetect" className="text-sm">
                            Auto-detect struggling students
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Zoom Preview */}
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Video className="w-4 h-4 text-blue-600" />
                Live Session Preview
              </h3>
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                {connected ? (
                  <div className="grid grid-cols-3 gap-1 w-full h-full p-2">
                    {/* display luve feed of a chrome tab */}
                    <div className="col-span-3 flex flex-col items-center w-full h-full">
                      {!screenStream ? null : (
                        <video
                          autoPlay
                          playsInline
                          controls={false}
                          ref={video => {
                            if (video && screenStream) {
                              video.srcObject = screenStream;
                            }
                          }}
                          className="w-full h-full rounded-lg border"
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Connect to Zoom to start monitoring</p>
                  </div>
                )}
              </div>
            </div>

            {/* Live Alerts */}
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                Live Alerts
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {strugglingStudents.slice(0, 5).map(student => (
                  <div key={student.id} className="p-3 bg-red-50 rounded-lg border-l-4 border-red-400">
                    <div className="flex items-center gap-2">
                      <img 
                        src={student.avatar} 
                        alt={student.name}
                        className="w-8 h-8 rounded-full"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{student.name}</p>
                        <p className="text-xs text-gray-600">{student.topic}</p>
                        <p className="text-xs text-red-600">Confusion: {overallAttentiveness !== null ? overallAttentiveness : student.confusion}%</p>
                      </div>
                    </div>
                  </div>
                ))}
                {strugglingStudents.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No alerts - all students are engaged! ✨
                  </p>
                )}
              </div>
            </div>

            {/* Active Peer Nodes */}
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-green-600" />
                Active Peer Nodes
              </h3>
              <div className="space-y-3">
                {peerNodes.map(node => (
                  <div key={node.name} className="p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-green-800">{node.name}</h4>
                      <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full">
                        {node.members.length} members
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {node.members.map(member => (
                        <img 
                          key={member.id}
                          src={member.avatar} 
                          alt={member.name}
                          className="w-6 h-6 rounded-full border border-white"
                          title={member.name}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                {peerNodes.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No active peer nodes yet
                  </p>
                )}
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                Recent Notifications
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {notifications.map(notification => (
                  <div key={notification.id} className={`p-2 rounded-lg text-xs ${
                    notification.type === 'success' ? 'bg-green-50 text-green-700' :
                    notification.type === 'error' ? 'bg-red-50 text-red-700' :
                    notification.type === 'alert' ? 'bg-yellow-50 text-yellow-700' :
                    'bg-blue-50 text-blue-700'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span>{notification.message}</span>
                      <span className="text-gray-500">{notification.timestamp}</span>
                    </div>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No notifications yet
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Peer Node Modal */}
      {showCreateNode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Create Peer Learning Node</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Node Name</label>
                <input
                  type="text"
                  placeholder="e.g., Calculus Help Group"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={nodeName}
                  onChange={(e) => setNodeName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Selected Students ({selectedStudents.length})
                </label>
                <div className="max-h-32 overflow-y-auto border rounded-lg p-2">
                  {selectedStudents.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-2">
                      No students selected
                    </p>
                  ) : (
                    students
                      .filter(s => selectedStudents.includes(s.id))
                      .map(student => (
                        <div key={student.id} className="flex items-center gap-2 p-1">
                          <img 
                            src={student.avatar} 
                            alt={student.name}
                            className="w-6 h-6 rounded-full"
                          />
                          <span className="text-sm">{student.name}</span>
                        </div>
                      ))
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateNode(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createPeerNode}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Create Node
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <video ref={videoRef} style={{ display: 'none' }} autoPlay playsInline muted />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}