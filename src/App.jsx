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

function App() {
  const [jobs, setJobs] = useState([]);
  const [showPostForm, setShowPostForm] = useState(false);
  
  const [userRole, setUserRole] = useState("worker"); 

  // Form States
  const [newTitle, setNewTitle] = useState("");
  const [newShop, setNewShop] = useState("");
  const [newPay, setNewPay] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPhoto, setNewPhoto] = useState(null); // NEW: Photo state
  const [isUploading, setIsUploading] = useState(false); // NEW: Loading state

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
    setIsUploading(true);
    let imageUrl = null;

    // 3. UPLOAD PHOTO TO SUPABASE STORAGE
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

      // Get the public URL of the uploaded image
      const { data: publicUrlData } = supabase.storage
        .from('job-photos')
        .getPublicUrl(filePath);
        
      imageUrl = publicUrlData.publicUrl;
    }
    
    // 4. SAVE JOB TO DATABASE
    const { error } = await supabase
      .from('jobs')
      .insert([
        { 
          title: newTitle, 
          shop: newShop, 
          pay: newPay, 
          location: newLocation, 
          phone: newPhone,
          image_url: imageUrl // Save the image link
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

  return (
    <div className="app-container">
      <header className="header">
        <h1>FurnitureWork</h1>
        
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
            
            {/* 5. SHOW PHOTO ON JOB CARD (IF IT EXISTS) */}
            {job.image_url && (
              <img 
                src={job.image_url} 
                alt={job.title} 
                style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '8px', marginBottom: '10px' }} 
              />
            )}

            <h3>{job.title}</h3>
            <p><strong>Shop:</strong> {job.shop}</p>
            <p><strong>Location:</strong> {job.location}</p>
            
            {/* 6. SHOW TIME AGO HERE */}
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
              Posted {getTimeAgo(job.created_at)}
            </p>

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
            
            {/* 7. ADDED SOFA CLEANING AND MAMA FUA TO THE DROPDOWN */}
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
            
            {/* 8. ADDED FILE INPUT FOR PHOTO */}
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
    </div>
  );
}

export default App;