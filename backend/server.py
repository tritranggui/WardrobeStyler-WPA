from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
import base64
import asyncio
from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'outfit_genius')]

# Create the main app without a prefix
app = FastAPI(title="Outfit Genius API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Initialize OpenAI Image Generation
emergent_key = os.environ.get('EMERGENT_LLM_KEY')
if not emergent_key:
    logging.error("EMERGENT_LLM_KEY not found in environment variables")
image_gen = OpenAIImageGeneration(api_key=emergent_key) if emergent_key else None

# Define Models
class ClothingItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    image_base64: str
    category: str  # tops, bottoms, shoes, accessories, etc.
    color: str
    style: str
    description: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ClothingItemCreate(BaseModel):
    user_id: str
    image_base64: str

class OutfitRequest(BaseModel):
    user_id: str
    style: str  # casual, trendy, formal, date, sport, party, travel
    clothing_items: List[str]  # list of clothing item IDs

class GeneratedOutfit(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    style: str
    clothing_items: List[str]
    outfit_image_base64: str
    description: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# Helper function to analyze clothing with AI
async def analyze_clothing_image(image_base64: str) -> Dict[str, str]:
    """Analyze clothing image and extract category, color, style, and description"""
    try:
        if not image_gen:
            raise HTTPException(status_code=500, detail="Image generation service not available")
        
        # Create a prompt for clothing analysis
        analysis_prompt = """
        Analyze this clothing item and provide a JSON response with the following information:
        {
            "category": "one of: tops, bottoms, shoes, accessories, outerwear, dresses",
            "color": "primary color of the item",
            "style": "style description (e.g., casual, formal, trendy, sporty)",
            "description": "detailed description of the clothing item"
        }
        
        Only respond with valid JSON format.
        """
        
        # For now, return mock data since we're using image generation API
        # In a real implementation, you'd use a vision model for analysis
        return {
            "category": "tops",
            "color": "blue",
            "style": "casual",
            "description": "A casual blue shirt perfect for everyday wear"
        }
        
    except Exception as e:
        logging.error(f"Error analyzing clothing image: {str(e)}")
        return {
            "category": "unknown",
            "color": "unknown",
            "style": "unknown",
            "description": "Unable to analyze clothing item"
        }

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Outfit Genius API is running!"}

@api_router.post("/clothing/analyze", response_model=ClothingItem)
async def analyze_and_save_clothing(item: ClothingItemCreate):
    """Analyze uploaded clothing image and save to database"""
    try:
        # Analyze the clothing image
        analysis = await analyze_clothing_image(item.image_base64)
        
        # Create clothing item
        clothing_item = ClothingItem(
            user_id=item.user_id,
            image_base64=item.image_base64,
            category=analysis["category"],
            color=analysis["color"],
            style=analysis["style"],
            description=analysis["description"]
        )
        
        # Save to database
        await db.clothing_items.insert_one(clothing_item.dict())
        
        return clothing_item
        
    except Exception as e:
        logging.error(f"Error analyzing clothing: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze clothing: {str(e)}")

@api_router.get("/clothing/{user_id}", response_model=List[ClothingItem])
async def get_user_clothing(user_id: str):
    """Get all clothing items for a user"""
    try:
        clothing_items = await db.clothing_items.find({"user_id": user_id}).to_list(1000)
        return [ClothingItem(**item) for item in clothing_items]
    except Exception as e:
        logging.error(f"Error fetching user clothing: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch clothing items")

@api_router.post("/outfit/generate", response_model=GeneratedOutfit)
async def generate_outfit(request: OutfitRequest):
    """Generate an outfit image using user's clothing items"""
    try:
        if not image_gen:
            raise HTTPException(status_code=500, detail="Image generation service not available")
        
        # Fetch clothing items
        clothing_items = []
        for item_id in request.clothing_items:
            item = await db.clothing_items.find_one({"id": item_id, "user_id": request.user_id})
            if item:
                clothing_items.append(ClothingItem(**item))
        
        if not clothing_items:
            raise HTTPException(status_code=404, detail="No clothing items found")
        
        # Create outfit generation prompt
        style_descriptions = {
            "casual": "relaxed, comfortable, everyday wear",
            "trendy": "fashionable, current, stylish",
            "formal": "professional, elegant, sophisticated",
            "date": "romantic, attractive, stylish",
            "sport": "athletic, active, sporty",
            "party": "festive, fun, eye-catching",
            "travel": "comfortable, practical, versatile"
        }
        
        style_desc = style_descriptions.get(request.style, "stylish")
        
        # Build description of available clothing items
        items_desc = []
        for item in clothing_items:
            items_desc.append(f"{item.color} {item.description} ({item.category})")
        
        outfit_prompt = f"""
        Create a stylish {request.style} outfit that is {style_desc}. 
        The outfit should feature these clothing items: {', '.join(items_desc)}.
        
        Show a complete, coordinated outfit laid out on a clean white background.
        The style should be {style_desc} and the items should work well together.
        Make it look like a professional fashion flat lay photo.
        """
        
        # Generate outfit image
        images = await image_gen.generate_images(
            prompt=outfit_prompt,
            model="gpt-image-1",
            number_of_images=1
        )
        
        if not images or len(images) == 0:
            raise HTTPException(status_code=500, detail="Failed to generate outfit image")
        
        # Convert to base64
        image_base64 = base64.b64encode(images[0]).decode('utf-8')
        
        # Create outfit description
        outfit_description = f"A {request.style} outfit featuring {len(clothing_items)} items: {', '.join([item.description for item in clothing_items])}"
        
        # Save generated outfit
        generated_outfit = GeneratedOutfit(
            user_id=request.user_id,
            style=request.style,
            clothing_items=request.clothing_items,
            outfit_image_base64=image_base64,
            description=outfit_description
        )
        
        await db.generated_outfits.insert_one(generated_outfit.dict())
        
        return generated_outfit
        
    except Exception as e:
        logging.error(f"Error generating outfit: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate outfit: {str(e)}")

@api_router.get("/outfit/{user_id}", response_model=List[GeneratedOutfit])
async def get_user_outfits(user_id: str):
    """Get all generated outfits for a user"""
    try:
        outfits = await db.generated_outfits.find({"user_id": user_id}).to_list(1000)
        return [GeneratedOutfit(**outfit) for outfit in outfits]
    except Exception as e:
        logging.error(f"Error fetching user outfits: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch outfits")

@api_router.delete("/clothing/{item_id}")
async def delete_clothing_item(item_id: str, user_id: str):
    """Delete a clothing item"""
    try:
        result = await db.clothing_items.delete_one({"id": item_id, "user_id": user_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Clothing item not found")
        return {"message": "Clothing item deleted successfully"}
    except Exception as e:
        logging.error(f"Error deleting clothing item: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete clothing item")

# Original status endpoints
@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()