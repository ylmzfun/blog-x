package handlers

import (
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"backend/config"
	"backend/models"
	"backend/utils"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

func GetMe(c *gin.Context) {
	userID := c.GetUint("userId")
	var user models.User
	if err := models.DB.First(&user, userID).Error; err != nil {
		utils.Error(c, 404, "用户不存在")
		return
	}
	utils.Success(c, user)
}

type updateMeInput struct {
	Username *string `json:"username"`
	Bio      *string `json:"bio"`
	Website  *string `json:"website"`
}

func UpdateMe(c *gin.Context) {
	userID := c.GetUint("userId")
	var input updateMeInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.Error(c, 400, "参数错误")
		return
	}

	updates := map[string]interface{}{}
	if input.Username != nil {
		if len(*input.Username) < 2 {
			utils.Error(c, 400, "用户名至少 2 个字符")
			return
		}
		updates["username"] = *input.Username
	}
	if input.Bio != nil {
		updates["bio"] = *input.Bio
	}
	if input.Website != nil {
		updates["website"] = *input.Website
	}

	if len(updates) == 0 {
		utils.Error(c, 400, "没有需要修改的字段")
		return
	}

	if err := models.DB.Model(&models.User{}).Where("id = ?", userID).Updates(updates).Error; err != nil {
		utils.Error(c, 500, "更新失败")
		return
	}

	var user models.User
	models.DB.First(&user, userID)
	utils.Success(c, user)
}

func UpdatePassword(c *gin.Context) {
	userID := c.GetUint("userId")
	var input struct {
		OldPassword string `json:"oldPassword" binding:"required"`
		NewPassword string `json:"newPassword" binding:"required,min=6"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.Error(c, 400, "参数错误")
		return
	}

	var user models.User
	if err := models.DB.First(&user, userID).Error; err != nil {
		utils.Error(c, 404, "用户不存在")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.OldPassword)); err != nil {
		utils.Error(c, 400, "旧密码不正确")
		return
	}

	hash, _ := bcrypt.GenerateFromPassword([]byte(input.NewPassword), bcrypt.DefaultCost)
	models.DB.Model(&user).Update("password_hash", string(hash))

	utils.Success(c, gin.H{"message": "密码修改成功"})
}

func GetUserPublic(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		utils.Error(c, 404, "用户不存在")
		return
	}

	var user models.User
	if err := models.DB.Select("id, username, avatar, bio, website, role, created_at").First(&user, id).Error; err != nil {
		utils.Error(c, 404, "用户不存在")
		return
	}
	utils.Success(c, user)
}

func UploadAvatar(c *gin.Context) {
	userID := c.GetUint("userId")
	file, err := c.FormFile("file")
	if err != nil {
		utils.Error(c, 400, "请选择文件")
		return
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	allowed := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true}
	if !allowed[ext] {
		utils.Error(c, 400, "不支持的图片格式")
		return
	}

	cfg := config.Load()
	filename := "avatar_" + strconv.FormatUint(uint64(userID), 10) + "_" + strconv.FormatInt(time.Now().UnixMilli(), 10) + ext
	savePath := filepath.Join(cfg.UploadDir, filename)

	if err := c.SaveUploadedFile(file, savePath); err != nil {
		utils.Error(c, 500, "文件保存失败")
		return
	}

	url := "/uploads/" + filename
	models.DB.Model(&models.User{}).Where("id = ?", userID).Update("avatar", url)

	utils.Success(c, gin.H{"url": url})
}
