import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { createClient } from '@supabase/supabase-js';
import 'leaflet/dist/leaflet.css';
import './App.css';

const SUPABASE_URL = 'https://vqaatjuqpqlbajxoufyr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_CHCZJ1wEvB2Q_kFmcAlXrA_cM9WVIVb';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function App() {
  const [jobs, setJobs] = useState([]);
  const [showPostForm, setShowPostForm] = useState(false);
  
  // NEW: Track if the user is a Shop Owner or a Worker
  const [userRole, setUserRole] = useState("worker"); 

  // Form States
  const [newTitle, setNewTitle] = useState("");
  const [newShop, setNewShop] = useState("");
  const [newPay, setNewPay] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newPhone, setNewPhone] = useState("");

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error) setJobs(data);
  };

  const handlePostJob = async (e) => {
    e.preventDefault();
    
    const { error } = await supabase
      .from('jobs')
      .insert([
        { title: newTitle, shop: newShop, pay: newPay, location: newLocation, phone: newPhone }
      ]);

    if (error) {
      alert("Error posting job: " + error.message);
    } else {
      setNewTitle(""); setNewShop(""); setNewPay(""); setNewLocation(""); setNewPhone("");
      setShowPostForm(false);
      fetchJobs();
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>FurnitureWork</h1>
        
        {/* ROLE TOGGLE SWITCH */}
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
                {job.pay} KES
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="job-list">
        <h2>Available Jobs ({jobs.length})</h2>
        {jobs.length === 0 && <p>No jobs posted yet.</p>}
        
        {jobs.map(job => (
          <div key={job.id} className="job-card">
            <h3>{job.title}</h3>
            <p><strong>Shop:</strong> {job.shop}</p>
            <p><strong>Location:</strong> {job.location}</p>
            <p className="pay-tag">{job.pay} KES</p>
            
            <a 
              href={`https://wa.me/${job.phone}?text=Hello ${job.shop}, I saw your job for a ${job.title} on FurnitureWork. I am interested!`} 
              target="_blank" 
              rel="noreferrer"
              className="apply-btn"
              style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}
            >
              Apply via WhatsApp
            </a>
          </div>
        ))}
      </div>

      {/* ONLY SHOW POST BUTTON IF THE USER IS A SHOP OWNER */}
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
            
            <input type="text" placeholder="Job Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required />
            <input type="text" placeholder="Shop Name" value={newShop} onChange={(e) => setNewShop(e.target.value)} required />
            <input type="text" placeholder="Payment Amount (e.g. 1500)" value={newPay} onChange={(e) => setNewPay(e.target.value)} required />
            <input type="text" placeholder="Location (e.g. Kasarani)" value={newLocation} onChange={(e) => setNewLocation(e.target.value)} required />
            <input type="text" placeholder="WhatsApp Number (e.g. 254712345678)" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} required />
            
            <button type="submit" className="submit-btn">Post Job</button>
            <button type="button" className="close-btn" onClick={() => setShowPostForm(false)}>Cancel</button>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;