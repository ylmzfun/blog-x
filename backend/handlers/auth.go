package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"time"

	"backend/config"
	"backend/models"
	"backend/utils"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

type registerInput struct {
	Username string `json:"username" binding:"required,min=2,max=50"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6,max=100"`
}

func Register(c *gin.Context) {
	var input registerInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.Error(c, 400, "参数错误："+err.Error())
		return
	}

	var existing models.User
	if models.DB.Where("email = ?", input.Email).Or("username = ?", input.Username).First(&existing).Error == nil {
		utils.Error(c, 400, "邮箱或用户名已被注册")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		utils.Error(c, 500, "服务器错误")
		return
	}

	user := models.User{
		Username:     input.Username,
		Email:        input.Email,
		PasswordHash: string(hash),
		Role:         "user",
	}

	if models.DB.Create(&user).Error != nil {
		utils.Error(c, 500, "注册失败")
		return
	}

	utils.Success(c, gin.H{
		"id":       user.ID,
		"username": user.Username,
		"email":    user.Email,
	})
}

type loginInput struct {
	Login    string `json:"login" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func Login(c *gin.Context) {
	var input loginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.Error(c, 400, "参数错误")
		return
	}

	var user models.User
	if err := models.DB.Where("email = ? OR username = ?", input.Login, input.Login).First(&user).Error; err != nil {
		utils.Error(c, 401, "用户名或密码错误")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)); err != nil {
		utils.Error(c, 401, "用户名或密码错误")
		return
	}

	cfg := config.Load()
	accessToken, _ := utils.GenerateToken(user.ID, user.Username, user.Role, cfg.JWTSecret, 2*time.Hour)
	refreshToken, _ := utils.GenerateToken(user.ID, user.Username, user.Role, cfg.JWTSecret, 7*24*time.Hour)

	models.DB.Model(&user).Update("refresh_token", refreshToken)

	utils.Success(c, gin.H{
		"accessToken":  accessToken,
		"refreshToken": refreshToken,
		"user": gin.H{
			"id":       user.ID,
			"username": user.Username,
			"email":    user.Email,
			"avatar":   user.Avatar,
			"bio":      user.Bio,
			"role":     user.Role,
		},
	})
}

func Logout(c *gin.Context) {
	userID := c.GetUint("userId")
	models.DB.Model(&models.User{}).Where("id = ?", userID).Update("refresh_token", "")
	utils.Success(c, nil)
}

type refreshInput struct {
	RefreshToken string `json:"refreshToken" binding:"required"`
}

func Refresh(c *gin.Context) {
	var input refreshInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.Error(c, 400, "参数错误")
		return
	}

	cfg := config.Load()
	claims, err := utils.ParseToken(input.RefreshToken, cfg.JWTSecret)
	if err != nil {
		utils.Error(c, 401, "refresh token 无效或已过期")
		return
	}

	var user models.User
	if err := models.DB.First(&user, claims.UserID).Error; err != nil {
		utils.Error(c, 401, "用户不存在")
		return
	}

	if user.RefreshToken != input.RefreshToken {
		utils.Error(c, 401, "refresh token 已失效")
		return
	}

	accessToken, _ := utils.GenerateToken(user.ID, user.Username, user.Role, cfg.JWTSecret, 2*time.Hour)
	newRefreshToken, _ := utils.GenerateToken(user.ID, user.Username, user.Role, cfg.JWTSecret, 7*24*time.Hour)
	models.DB.Model(&user).Update("refresh_token", newRefreshToken)

	utils.Success(c, gin.H{
		"accessToken":  accessToken,
		"refreshToken": newRefreshToken,
	})
}

func ForgotPassword(c *gin.Context) {
	var input struct {
		Email string `json:"email" binding:"required,email"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.Error(c, 400, "参数错误")
		return
	}

	var user models.User
	if err := models.DB.Where("email = ?", input.Email).First(&user).Error; err != nil {
		// don't reveal whether email exists
		utils.Success(c, gin.H{"message": "如果邮箱已注册，重置链接已发送"})
		return
	}

	// Generate a reset token (simplified: store as refresh_token)
	tokenBytes := make([]byte, 32)
	rand.Read(tokenBytes)
	resetToken := hex.EncodeToString(tokenBytes)
	models.DB.Model(&user).Update("refresh_token", "reset:"+resetToken)

	// In production, send email. For now just return the token for dev.
	utils.Success(c, gin.H{
		"message":    "如果邮箱已注册，重置链接已发送",
		"resetToken": resetToken,
	})
}

func ResetPassword(c *gin.Context) {
	var input struct {
		Token    string `json:"token" binding:"required"`
		Password string `json:"password" binding:"required,min=6"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.Error(c, 400, "参数错误")
		return
	}

	var user models.User
	if err := models.DB.Where("refresh_token = ?", "reset:"+input.Token).First(&user).Error; err != nil {
		utils.Error(c, 400, "重置链接无效或已过期")
		return
	}

	hash, _ := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	models.DB.Model(&user).Updates(map[string]interface{}{
		"password_hash": string(hash),
		"refresh_token": "",
	})

	utils.Success(c, gin.H{"message": "密码重置成功"})
}

func CORSMiddleware(c *gin.Context) {
	cfg := config.Load()
	c.Header("Access-Control-Allow-Origin", cfg.AllowOrigin)
	c.Header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
	c.Header("Access-Control-Allow-Headers", "Content-Type,Authorization")
	c.Header("Access-Control-Allow-Credentials", "true")
	if c.Request.Method == http.MethodOptions {
		c.AbortWithStatus(http.StatusNoContent)
		return
	}
	c.Next()
}
