import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { createClient } from '@supabase/supabase-js';
import 'leaflet/dist/leaflet.css';
import './App.css';

// 1. FIX THE MAP ICONS
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Marker.prototype.options.icon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const SUPABASE_URL = 'https://vqaatjuqpqlbajxoufyr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_CHCZJ1wEvB2Q_kFmcAlXrA_cM9WVIVb';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. TIME AGO FUNCTION
function getTimeAgo(dateString) {
  if (!dateString) return "Just now";
  const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

// 3. PRICE FORMATTER FUNCTION
function formatPrice(price) {
  if (!price) return "Contact for price";
  let cleanPrice = price.toString().replace(/[^0-9-]/gi, ''); 
  return `KSH ${cleanPrice}`;
}

function App() {
  // --- AUTH STATES ---
  const [session, setSession] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // --- APP STATES ---
  const [jobs, setJobs] = useState([]);
  const [showPostForm, setShowPostForm] = useState(false);
  const [userRole, setUserRole] = useState("worker"); 
  const [searchTerm, setSearchTerm] = useState(""); 

  // --- COMMENT STATES (Moved inside App) ---
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [activeJobId, setActiveJobId] = useState(null);

  // Form States
  const [newTitle, setNewTitle] = useState("");
  const [newShop, setNewShop] = useState("");
  const [newPay, setNewPay] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPhoto, setNewPhoto] = useState(null); 
  const [isUploading, setIsUploading] = useState(false); 

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for login/logout changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetchJobs();
  }, []);

  // --- COMMENT FUNCTIONS (Moved inside App) ---
  useEffect(() => {
    const fetchComments = async () => {
      const { data } = await supabase.from('comments').select('*');
      if (data) setComments(data);
    };
    fetchComments();
  }, []);

  const handlePostComment = async (e, jobId) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      alert("Please log in to post a comment.");
      return;
    }

    const text = newComment;
    if (!text) return;

    const { error } = await supabase
      .from('comments')
      .insert([{
        job_id: jobId,
        user_id: user.id,
        user_name: user.email,
        comment_text: text
      }]);

    if (!error) {
      setNewComment(''); // Clear the input
      // Refresh the comments list
      const { data } = await supabase.from('comments').select('*');
      if (data) setComments(data);
    } else {
      alert("Error posting comment.");
      console.log(error);
    }
  };

  const fetchJobs = async () => {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error) setJobs(data);
  };

  // --- AUTH FUNCTIONS ---
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    if (isRegistering) {
      // Sign Up
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setAuthError(error.message);
      else alert("Registration successful! You can now log in.");
    } else {
      // Log In
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setAuthError(error.message);
    }
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handlePostJob = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    let imageUrl = null;

    if (newPhoto) {
      const fileExt = newPhoto.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('job-photos')
        .upload(filePath, newPhoto);

      if (uploadError) {
        alert("Error uploading photo: " + uploadError.message);
        setIsUploading(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('job-photos')
        .getPublicUrl(filePath);
        
      imageUrl = publicUrlData.publicUrl;
    }
    
    const { error } = await supabase
      .from('jobs')
      .insert([
        { 
          title: newTitle, 
          shop: newShop, 
          pay: newPay, 
          location: newLocation, 
          phone: newPhone,
          image_url: imageUrl 
        }
      ]);

    if (error) {
      alert("Error posting job: " + error.message);
    } else {
      setNewTitle(""); setNewShop(""); setNewPay(""); setNewLocation(""); setNewPhone(""); setNewPhoto(null);
      setShowPostForm(false);
      fetchJobs();
    }
    setIsUploading(false);
  };

  const filteredJobs = jobs.filter((job) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      job.title?.toLowerCase().includes(searchLower) ||
      job.shop?.toLowerCase().includes(searchLower) ||
      job.location?.toLowerCase().includes(searchLower)
    );
  });

  // --- IF NOT LOGGED IN, SHOW THE AUTH SCREEN ---
  if (!session) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f4f4f4', padding: '20px' }}>
        <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
          
          <h2 style={{ textAlign: 'center', color: '#2e7d32', marginBottom: '20px' }}>
            {isRegistering ? "Create an Account" : "Login to FurnitureWork"}
          </h2>

          {authError && <p style={{ color: 'red', textAlign: 'center', fontSize: '14px' }}>{authError}</p>}

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input 
              type="email" 
              placeholder="Email Address" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              style={{ padding: '12px', borderRadius: '5px', border: '1px solid #ccc' }}
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              style={{ padding: '12px', borderRadius: '5px', border: '1px solid #ccc' }}
            />
            <button 
              type="submit" 
              disabled={authLoading} 
              style={{ padding: '12px', backgroundColor: '#2e7d32', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              {authLoading ? "Please wait..." : (isRegistering ? "Sign Up" : "Log In")}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px' }}>
            {isRegistering ? "Already have an account?" : "Don't have an account?"}
            <button 
              onClick={() => { setIsRegistering(!isRegistering); setAuthError(""); }} 
              style={{ background: 'none', border: 'none', color: '#2e7d32', cursor: 'pointer', fontWeight: 'bold', marginLeft: '5px' }}
            >
              {isRegistering ? "Log In" : "Sign Up"}
            </button>
          </p>

        </div>
      </div>
    );
  }

  // --- IF LOGGED IN, SHOW THE MAIN APP ---
  return (
    <div className="app-container">
      <header className="header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '15px' }}>
          <h1 style={{ margin: 0 }}>FurnitureWork</h1>
          <button 
            onClick={handleLogout} 
            style={{ padding: '8px 12px', backgroundColor: '#d32f2f', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}
          >
            Logout
          </button>
        </div>
        
        <div className="role-toggle">
          <button 
            className={userRole === "worker" ? "active-role" : "inactive-role"}
            onClick={() => setUserRole("worker")}
          >
            👷 I am a Worker
          </button>
          <button 
            className={userRole === "owner" ? "active-role" : "inactive-role"}
            onClick={() => setUserRole("owner")}
          >
            🏪 I am a Shop Owner
          </button>
        </div>
      </header>

      <div className="map-container">
        <MapContainer center={[-1.286389, 36.817223]} zoom={11} style={{ height: "100%", width: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {jobs.map((job, index) => (
            <Marker key={job.id} position={[-1.286389 + (index * 0.01), 36.817223 + (index * 0.01)]}>
              <Popup>
                <strong>{job.title}</strong><br/>
                {job.shop}<br/>
                {formatPrice(job.pay)}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="job-list">
        <input 
          type="text" 
          placeholder="🔍 Search by job, shop, or location..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ padding: '12px', marginBottom: '20px', width: '100%', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px', boxSizing: 'border-box' }}
        />

        <h2>Available Jobs ({filteredJobs.length})</h2>
        {filteredJobs.length === 0 && <p>No jobs found matching your search.</p>}
        
        {filteredJobs.map(job => (
          <div key={job.id} className="job-card">
            {job.image_url && (
              <img src={job.image_url} alt={job.title} style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '8px', marginBottom: '10px' }} />
            )}
            <h3>{job.title}</h3>
            <p><strong>Shop:</strong> {job.shop}</p>
            <p><strong>Location:</strong> {job.location}</p>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>Posted {getTimeAgo(job.created_at)}</p>
            <p className="pay-tag">{formatPrice(job.pay)}</p>
            <a href={`https://wa.me/${job.phone}?text=Hello ${job.shop}, I saw your job for a ${job.title} on FurnitureWork. I am interested!`} target="_blank" rel="noreferrer" className="apply-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
              Apply via WhatsApp
            </a>
            {/* --- COMMENTS SECTION --- */}
            <div style={{ marginTop: '15px', borderTop: '1px solid #ddd', paddingTop: '10px' }}>
              
              <button 
                type="button"
                onClick={() => setActiveJobId(activeJobId === job.id ? null : job.id)}
                style={{ background: 'none', border: 'none', color: '#2e7d32', fontWeight: 'bold', cursor: 'pointer', padding: 0 }}
              >
                {activeJobId === job.id ? 'Hide Comments' : 'View / Add Comments'}
              </button>

              {activeJobId === job.id && (
                <div style={{ marginTop: '10px' }}>
                  
                  {/* List Comments */}
                  {comments.filter(c => c.job_id === job.id).length === 0 ? (
                    <p style={{ fontSize: '13px', color: '#666' }}>No comments yet.</p>
                  ) : (
                    comments.filter(c => c.job_id === job.id).map(c => (
                      <div key={c.id} style={{ background: '#f5f5f5', padding: '8px', borderRadius: '5px', marginBottom: '5px', fontSize: '13px' }}>
                        <strong>{c.user_name.split('@')[0]}: </strong> {c.comment_text}
                      </div>
                    ))
                  )}

                  {/* Input Form */}
                  <form onSubmit={(e) => handlePostComment(e, job.id)} style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                    <input 
                      type="text" 
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Ask a question..." 
                      style={{ flex: 1, padding: '8px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '13px' }}
                    />
                    <button type="submit" style={{ background: '#333', color: 'white', padding: '8px 12px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontSize: '13px' }}>
                      Post
                    </button>
                  </form>

                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {userRole === "owner" && (
        <button className="float-btn" onClick={() => setShowPostForm(!showPostForm)}>
          + Post a Job
        </button>
      )}

      {showPostForm && userRole === "owner" && (
        <div className="modal">
          <form className="modal-content" onSubmit={handlePostJob}>
            <h2>Post a Job</h2>
            <p>First job is free.</p>
            <select value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required style={{ padding: '10px', width: '100%', marginBottom: '10px', borderRadius: '5px' }}>
              <option value="">Select Job Type</option>
              <option value="L seat seat design 7seater">L seat seat design 7seater</option>
              <option value="Sofa Cleaning">Sofa Cleaning</option>
              <option value="Mama Fua (Laundry)">Mama Fua (Laundry)</option>
              <option value="Other Furniture Work">Other Furniture Work</option>
            </select>
            <input type="text" placeholder="Shop Name" value={newShop} onChange={(e) => setNewShop(e.target.value)} required />
            <input type="text" placeholder="Payment Amount (e.g. 1500)" value={newPay} onChange={(e) => setNewPay(e.target.value)} required />
            <input type="text" placeholder="Location (e.g. Kasarani)" value={newLocation} onChange={(e) => setNewLocation(e.target.value)} required />
            <input type="text" placeholder="WhatsApp Number (e.g. 254712345678)" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} required />
            <div style={{ margin: '10px 0' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Upload Job Photo (Optional)</label>
              <input type="file" accept="image/*" onChange={(e) => setNewPhoto(e.target.files[0])} />
            </div>
            <button type="submit" className="submit-btn" disabled={isUploading}>
              {isUploading ? "Uploading..." : "Post Job"}
            </button>
            <button type="button" className="close-btn" onClick={() => setShowPostForm(false)}>Cancel</button>
          </form>
        </div>
      )}

      <footer style={{ textAlign: 'center', padding: '30px 20px', marginTop: '50px', backgroundColor: '#f4f4f4', borderTop: '1px solid #ddd', color: '#555', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
        <h3 style={{ margin: '0 0 5px 0', color: '#2e7d32' }}>FurnitureWork</h3>
        <p style={{ margin: '0 0 15px 0', fontWeight: 'bold' }}>Founder: Stephen Mogeni</p>
        <p style={{ margin: '5px 0' }}>Connecting skilled workers with top furniture shops.</p>
        <p style={{ margin: '15px 0 5px 0' }}>
          Need help or found a bug? <br/>
          Email: <strong><a href="mailto:rmogeni80@gmail.com" style={{color: '#2e7d32', textDecoration: 'none'}}>rmogeni80@gmail.com</a></strong> <br/>
          Phone: <strong style={{color: '#2e7d32'}}>0110448044</strong>
        </p>
        <p style={{ marginTop: '20px', fontSize: '12px', color: '#888' }}>
          &copy; {new Date().getFullYear()} FurnitureWork. All rights reserved.
        </p>
      </footer>

    </div>
  );
}

export default App;