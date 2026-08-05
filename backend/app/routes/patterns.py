from fastapi import APIRouter
from models.fingerprint import pattern_library
router = APIRouter()

@router.get("/")
async def get_patterns():
    return {"patterns": pattern_library.get_all()}
