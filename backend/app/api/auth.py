from fastapi import APIRouter, HTTPException, status
from app.auth import verify_credentials, create_access_token, get_current_user
from app.schemas.auth import LoginRequest, TokenResponse, UserResponse
from fastapi import Depends

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    if not verify_credentials(request.username, request.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    access_token = create_access_token(data={"sub": request.username})
    return TokenResponse(access_token=access_token)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(username=current_user["username"])
