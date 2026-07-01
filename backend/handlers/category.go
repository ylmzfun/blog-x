package handlers

import (
	"strconv"

	"backend/models"
	"backend/utils"

	"github.com/gin-gonic/gin"
)

func GetCategories(c *gin.Context) {
	var categories []models.Category
	models.DB.Order("created_at ASC").Find(&categories)
	utils.Success(c, categories)
}

func GetCategoryBySlug(c *gin.Context) {
	slug := c.Param("slug")
	var category models.Category
	if err := models.DB.Where("slug = ?", slug).First(&category).Error; err != nil {
		utils.Error(c, 404, "分类不存在")
		return
	}
	utils.Success(c, category)
}

type categoryInput struct {
	Name        string `json:"name" binding:"required"`
	Slug        string `json:"slug" binding:"required"`
	Description string `json:"description"`
}

func CreateCategory(c *gin.Context) {
	var input categoryInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.Error(c, 400, "参数错误")
		return
	}

	var existing models.Category
	if models.DB.Where("slug = ?", input.Slug).First(&existing).Error == nil {
		utils.Error(c, 400, "slug 已存在")
		return
	}

	category := models.Category{
		Name:        input.Name,
		Slug:        input.Slug,
		Description: input.Description,
	}

	if err := models.DB.Create(&category).Error; err != nil {
		utils.Error(c, 500, "创建失败")
		return
	}

	utils.Success(c, category)
}

func UpdateCategory(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		utils.Error(c, 404, "分类不存在")
		return
	}

	var category models.Category
	if err := models.DB.First(&category, id).Error; err != nil {
		utils.Error(c, 404, "分类不存在")
		return
	}

	var input categoryInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.Error(c, 400, "参数错误")
		return
	}

	updates := map[string]interface{}{
		"name":        input.Name,
		"slug":        input.Slug,
		"description": input.Description,
	}

	if err := models.DB.Model(&category).Updates(updates).Error; err != nil {
		utils.Error(c, 500, "更新失败")
		return
	}

	utils.Success(c, category)
}

func DeleteCategory(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		utils.Error(c, 404, "分类不存在")
		return
	}

	var category models.Category
	if err := models.DB.First(&category, id).Error; err != nil {
		utils.Error(c, 404, "分类不存在")
		return
	}

	// set posts in this category to null
	models.DB.Model(&models.Post{}).Where("category_id = ?", id).Update("category_id", nil)

	models.DB.Delete(&category)
	utils.Success(c, nil)
}

// Tag handlers

func GetTags(c *gin.Context) {
	var tags []models.Tag
	models.DB.Order("post_count DESC").Find(&tags)
	utils.Success(c, tags)
}

type tagInput struct {
	Name string `json:"name" binding:"required"`
	Slug string `json:"slug" binding:"required"`
}

func CreateTag(c *gin.Context) {
	var input tagInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.Error(c, 400, "参数错误")
		return
	}

	var existing models.Tag
	if models.DB.Where("slug = ?", input.Slug).First(&existing).Error == nil {
		utils.Error(c, 400, "slug 已存在")
		return
	}

	tag := models.Tag{
		Name: input.Name,
		Slug: input.Slug,
	}

	if err := models.DB.Create(&tag).Error; err != nil {
		utils.Error(c, 500, "创建失败")
		return
	}

	utils.Success(c, tag)
}

func DeleteTag(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		utils.Error(c, 404, "标签不存在")
		return
	}

	var tag models.Tag
	if err := models.DB.First(&tag, id).Error; err != nil {
		utils.Error(c, 404, "标签不存在")
		return
	}

	tx := models.DB.Begin()
	tx.Where("tag_id = ?", id).Delete(&models.PostTag{})
	tx.Delete(&tag)
	tx.Commit()

	utils.Success(c, nil)
}
