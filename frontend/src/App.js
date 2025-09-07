import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import axios from "axios";
import Webcam from "react-webcam";
import { Camera, Upload, Shirt, Sparkles, ArrowRight, ArrowLeft, Trash2, Check, Download, Share2, Wifi, WifiOff } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Generate a simple user ID for demo purposes
const USER_ID = "demo-user-" + Math.random().toString(36).substr(2, 9);

// Page 1: Photo Capture
const PhotoCapture = () => {
  const navigate = useNavigate();
  const [clothingItems, setClothingItems] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const webcamRef = React.useRef(null);

  useEffect(() => {
    loadClothingItems();
  }, []);

  const loadClothingItems = async () => {
    try {
      const response = await axios.get(`${API}/clothing/${USER_ID}`);
      setClothingItems(response.data);
    } catch (error) {
      console.error("Error loading clothing items:", error);
    }
  };

  const capturePhoto = React.useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      analyzePhoto(imageSrc.split(',')[1]); // Remove data:image/jpeg;base64, prefix
      setShowCamera(false);
    }
  }, [webcamRef]);

  const analyzePhoto = async (imageBase64) => {
    setIsAnalyzing(true);
    try {
      const response = await axios.post(`${API}/clothing/analyze`, {
        user_id: USER_ID,
        image_base64: imageBase64
      });
      
      setClothingItems(prev => [...prev, response.data]);
    } catch (error) {
      console.error("Error analyzing photo:", error);
      alert("Failed to analyze photo. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target.result.split(',')[1];
        analyzePhoto(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const deleteItem = async (itemId) => {
    try {
      await axios.delete(`${API}/clothing/${itemId}?user_id=${USER_ID}`);
      setClothingItems(prev => prev.filter(item => item.id !== itemId));
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  const proceedToStyleSelection = () => {
    if (clothingItems.length === 0) {
      alert("Please add at least one clothing item before proceeding.");
      return;
    }
    navigate("/style-selection");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-red-500">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            📸 Capture Your Wardrobe
          </h1>
          <p className="text-blue-100 text-lg">
            Take photos of your clothing items and let AI analyze them
          </p>
        </div>

        {/* Camera/Upload Section */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <button
              onClick={() => setShowCamera(true)}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105"
              disabled={isAnalyzing}
            >
              <Camera size={20} />
              Take Photo
            </button>
            
            <label className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-105">
              <Upload size={20} />
              Upload Photo
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isAnalyzing}
              />
            </label>
          </div>

          {isAnalyzing && (
            <div className="mt-4 text-center">
              <div className="inline-flex items-center gap-2 text-white">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Analyzing your clothing item...
              </div>
            </div>
          )}
        </div>

        {/* Camera Modal */}
        {showCamera && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold mb-4 text-center">Take a Photo</h3>
              <div className="mb-4">
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  className="w-full rounded-xl"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCamera(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-xl hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={capturePhoto}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Capture
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Clothing Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {clothingItems.map((item) => (
            <div key={item.id} className="bg-white/10 backdrop-blur-md rounded-2xl p-4 relative group">
              <button
                onClick={() => deleteItem(item.id)}
                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <Trash2 size={16} />
              </button>
              
              <div className="mb-4">
                <img
                  src={`data:image/jpeg;base64,${item.image_base64}`}
                  alt={item.description}
                  className="w-full h-48 object-cover rounded-xl"
                />
              </div>
              
              <div className="text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Shirt size={16} />
                  <span className="capitalize font-semibold">{item.category}</span>
                </div>
                <p className="text-sm text-blue-100 mb-1">
                  <strong>Color:</strong> {item.color}
                </p>
                <p className="text-sm text-blue-100 mb-1">
                  <strong>Style:</strong> {item.style}
                </p>
                <p className="text-sm text-blue-100">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {clothingItems.length === 0 && !isAnalyzing && (
          <div className="text-center text-white/70 py-12">
            <Shirt size={64} className="mx-auto mb-4 opacity-50" />
            <p className="text-xl">No clothing items yet</p>
            <p>Start by taking photos of your wardrobe!</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-end">
          <button
            onClick={proceedToStyleSelection}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-2xl text-lg font-semibold transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={clothingItems.length === 0}
          >
            Choose Style
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Page 2: Style Selection
const StyleSelection = () => {
  const navigate = useNavigate();
  const [selectedStyle, setSelectedStyle] = useState("");
  const [clothingCount, setClothingCount] = useState(0);

  useEffect(() => {
    loadClothingCount();
  }, []);

  const loadClothingCount = async () => {
    try {
      const response = await axios.get(`${API}/clothing/${USER_ID}`);
      setClothingCount(response.data.length);
    } catch (error) {
      console.error("Error loading clothing count:", error);
    }
  };

  const styles = [
    { id: "casual", name: "Casual", description: "Relaxed, comfortable, everyday wear", emoji: "👕" },
    { id: "trendy", name: "Trendy", description: "Fashionable, current, stylish", emoji: "✨" },
    { id: "formal", name: "Formal", description: "Professional, elegant, sophisticated", emoji: "👔" },
    { id: "date", name: "Date", description: "Romantic, attractive, stylish", emoji: "💕" },
    { id: "sport", name: "Sport", description: "Athletic, active, sporty", emoji: "🏃‍♀️" },
    { id: "party", name: "Party", description: "Festive, fun, eye-catching", emoji: "🎉" },
    { id: "travel", name: "Travel", description: "Comfortable, practical, versatile", emoji: "✈️" }
  ];

  const generateOutfit = () => {
    if (!selectedStyle) {
      alert("Please select a style first!");
      return;
    }
    navigate(`/outfit-generation?style=${selectedStyle}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-red-500">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            ✨ Choose Your Style
          </h1>
          <p className="text-blue-100 text-lg">
            Select the perfect style for your outfit ({clothingCount} items ready)
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {styles.map((style) => (
            <div
              key={style.id}
              onClick={() => setSelectedStyle(style.id)}
              className={`bg-white/10 backdrop-blur-md rounded-2xl p-6 cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                selectedStyle === style.id 
                  ? "ring-4 ring-yellow-400 bg-white/20" 
                  : "hover:bg-white/15"
              }`}
            >
              <div className="text-center text-white">
                <div className="text-6xl mb-4">{style.emoji}</div>
                <h3 className="text-2xl font-bold mb-2">{style.name}</h3>
                <p className="text-blue-100">{style.description}</p>
                {selectedStyle === style.id && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-yellow-400">
                    <Check size={20} />
                    <span className="font-semibold">Selected</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl transition-all duration-300"
          >
            <ArrowLeft size={20} />
            Back to Photos
          </button>
          
          <button
            onClick={generateOutfit}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-2xl text-lg font-semibold transition-all duration-300 transform hover:scale-105 disabled:opacity-50"
            disabled={!selectedStyle}
          >
            <Sparkles size={20} />
            Generate Outfit
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Page 3: Outfit Generation
const OutfitGeneration = () => {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedOutfit, setGeneratedOutfit] = useState(null);
  const [error, setError] = useState("");
  const [clothingItems, setClothingItems] = useState([]);

  const searchParams = new URLSearchParams(window.location.search);
  const selectedStyle = searchParams.get('style');

  useEffect(() => {
    loadClothingItems();
  }, []);

  useEffect(() => {
    if (clothingItems.length > 0 && selectedStyle && !generatedOutfit) {
      generateOutfit();
    }
  }, [clothingItems, selectedStyle]);

  const loadClothingItems = async () => {
    try {
      const response = await axios.get(`${API}/clothing/${USER_ID}`);
      setClothingItems(response.data);
    } catch (error) {
      console.error("Error loading clothing items:", error);
      setError("Failed to load your clothing items");
    }
  };

  const generateOutfit = async () => {
    setIsGenerating(true);
    setError("");
    
    try {
      const response = await axios.post(`${API}/outfit/generate`, {
        user_id: USER_ID,
        style: selectedStyle,
        clothing_items: clothingItems.map(item => item.id)
      });
      
      setGeneratedOutfit(response.data);
    } catch (error) {
      console.error("Error generating outfit:", error);
      setError("Failed to generate outfit. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const regenerateOutfit = () => {
    setGeneratedOutfit(null);
    generateOutfit();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-red-500">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            🎨 Your Outfit of the Day
          </h1>
          <p className="text-blue-100 text-lg capitalize">
            {selectedStyle} style • {clothingItems.length} items
          </p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-white p-4 rounded-xl mb-6 text-center">
            {error}
          </div>
        )}

        {isGenerating && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-12 text-center mb-8">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-6"></div>
            <h3 className="text-2xl font-bold text-white mb-2">Creating Your Perfect Outfit</h3>
            <p className="text-blue-100">
              Our AI is styling your {selectedStyle} look... This may take up to a minute.
            </p>
          </div>
        )}

        {generatedOutfit && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">
                Your {selectedStyle.charAt(0).toUpperCase() + selectedStyle.slice(1)} Outfit
              </h3>
              <p className="text-blue-100">{generatedOutfit.description}</p>
            </div>
            
            <div className="flex justify-center mb-6">
              <div className="bg-white rounded-2xl p-4 max-w-lg w-full">
                <img
                  src={`data:image/png;base64,${generatedOutfit.outfit_image_base64}`}
                  alt="Generated Outfit"
                  className="w-full h-auto rounded-xl"
                />
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={regenerateOutfit}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl mr-4 transition-all duration-300"
                disabled={isGenerating}
              >
                <Sparkles size={20} className="inline mr-2" />
                Try Another Style
              </button>
            </div>
          </div>
        )}

        {/* Your Clothing Items */}
        {clothingItems.length > 0 && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8">
            <h3 className="text-xl font-bold text-white mb-4">Items Used:</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {clothingItems.map((item) => (
                <div key={item.id} className="text-center">
                  <img
                    src={`data:image/jpeg;base64,${item.image_base64}`}
                    alt={item.description}
                    className="w-full h-24 object-cover rounded-lg mb-2"
                  />
                  <p className="text-white text-sm capitalize">{item.category}</p>
                  <p className="text-blue-100 text-xs">{item.color}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={() => navigate("/style-selection")}
            className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl transition-all duration-300"
          >
            <ArrowLeft size={20} />
            Change Style
          </button>
          
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition-all duration-300"
          >
            Add More Items
            <Camera size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PhotoCapture />} />
          <Route path="/style-selection" element={<StyleSelection />} />
          <Route path="/outfit-generation" element={<OutfitGeneration />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;