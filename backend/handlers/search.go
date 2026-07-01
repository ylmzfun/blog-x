package handlers

import (
	"backend/models"
	"backend/utils"

	"github.com/gin-gonic/gin"
)

func Search(c *gin.Context) {
	q := c.Query("q")
	if q == "" {
		utils.Error(c, 400, "请输入搜索关键词")
		return
	}

	page, pageSize := utils.GetPageParams(c)

	pattern := "%" + q + "%"
	query := models.DB.Model(&models.Post{}).Preload("Author").Preload("Category").Preload("Tags").
		Where("status = ?", "published").
		Where("title LIKE ? OR content LIKE ?", pattern, pattern).
		Order("pinned DESC, created_at DESC")

	var total int64
	query.Count(&total)

	var posts []models.Post
	query.Offset((page - 1) * pageSize).Limit(pageSize).Find(&posts)

	utils.Paginated(c, posts, total, page, pageSize)
}

func SearchSuggestions(c *gin.Context) {
	q := c.Query("q")
	if q == "" {
		utils.Success(c, []string{})
		return
	}

	pattern := "%" + q + "%"
	var titles []string
	models.DB.Model(&models.Post{}).
		Where("status = ? AND title LIKE ?", "published", pattern).
		Order("created_at DESC").
		Limit(10).
		Pluck("title", &titles)

	utils.Success(c, titles)
}
