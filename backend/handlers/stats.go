package handlers

import (
	"backend/models"
	"backend/utils"

	"github.com/gin-gonic/gin"
)

func GetOverview(c *gin.Context) {
	var postCount, commentCount, userCount int64

	models.DB.Model(&models.Post{}).Where("status = ?", "published").Count(&postCount)
	models.DB.Model(&models.Comment{}).Count(&commentCount)
	models.DB.Model(&models.User{}).Count(&userCount)

	utils.Success(c, gin.H{
		"postCount":    postCount,
		"commentCount": commentCount,
		"userCount":    userCount,
		"pv":           0, // simplified - would need a page_view table
		"uv":           0,
	})
}

func GetTopPosts(c *gin.Context) {
	var posts []models.Post
	models.DB.Preload("Author").
		Where("status = ?", "published").
		Order("view_count DESC").
		Limit(20).
		Find(&posts)

	utils.Success(c, posts)
}
