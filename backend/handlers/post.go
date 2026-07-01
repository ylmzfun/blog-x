package handlers

import (
	"strconv"
	"time"

	"backend/models"
	"backend/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func slugify(title string) string {
	s := ""
	for _, r := range title {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') {
			s += string(r)
		} else if r == ' ' || r == '-' || r == '_' {
			s += "-"
		}
	}
	if len(s) > 200 {
		s = s[:200]
	}
	return toLower(s)
}

func toLower(s string) string {
	b := []byte(s)
	for i, c := range b {
		if c >= 'A' && c <= 'Z' {
			b[i] = c + 32
		}
	}
	return string(b)
}

func GetPosts(c *gin.Context) {
	page, pageSize := utils.GetPageParams(c)
	status := c.DefaultQuery("status", "published")
	categorySlug := c.Query("category")
	tagSlug := c.Query("tag")
	sort := c.DefaultQuery("sort", "latest") // latest, popular

	query := models.DB.Model(&models.Post{}).Preload("Author").Preload("Category").Preload("Tags")

	if status != "" {
		query = query.Where("status = ?", status)
	}

	if categorySlug != "" {
		var cat models.Category
		if models.DB.Where("slug = ?", categorySlug).First(&cat).Error == nil {
			query = query.Where("category_id = ?", cat.ID)
		}
	}

	if tagSlug != "" {
		var tag models.Tag
		if models.DB.Where("slug = ?", tagSlug).First(&tag).Error == nil {
			query = query.Joins("JOIN post_tags ON post_tags.post_id = posts.id").
				Where("post_tags.tag_id = ?", tag.ID)
		}
	}

	switch sort {
	case "popular":
		query = query.Order("view_count DESC")
	case "pinned":
		query = query.Order("pinned DESC, created_at DESC")
	default:
		query = query.Order("pinned DESC, created_at DESC")
	}

	var total int64
	query.Count(&total)

	var posts []models.Post
	query.Offset((page - 1) * pageSize).Limit(pageSize).Find(&posts)

	utils.Paginated(c, posts, total, page, pageSize)
}

func GetPostBySlug(c *gin.Context) {
	slug := c.Param("slug")
	var post models.Post
	if err := models.DB.Preload("Author").Preload("Category").Preload("Tags").
		Where("slug = ? AND status = ?", slug, "published").First(&post).Error; err != nil {
		utils.Error(c, 404, "文章不存在")
		return
	}

	// increment view count
	models.DB.Model(&post).UpdateColumn("view_count", post.ViewCount+1)
	post.ViewCount++

	utils.Success(c, post)
}

type postInput struct {
	Title      string   `json:"title" binding:"required"`
	Content    string   `json:"content"`
	Summary    string   `json:"summary"`
	Cover      string   `json:"cover"`
	CategoryID *uint    `json:"categoryId"`
	Status     string   `json:"status"`
	Tags       []string `json:"tags"` // tag IDs as strings or tag names
}

func CreatePost(c *gin.Context) {
	var input postInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.Error(c, 400, "参数错误："+err.Error())
		return
	}

	userID := c.GetUint("userId")
	slug := slugify(input.Title)

	// ensure unique slug
	var count int64
	models.DB.Model(&models.Post{}).Where("slug = ?", slug).Count(&count)
	if count > 0 {
		slug = slug + "-" + strconv.FormatInt(time.Now().UnixMilli(), 10)
	}

	status := "draft"
	if input.Status == "published" {
		status = "published"
	}

	var publishedAt *time.Time
	if status == "published" {
		now := time.Now()
		publishedAt = &now
	}

	post := models.Post{
		Title:       input.Title,
		Slug:        slug,
		Content:     input.Content,
		Summary:     input.Summary,
		Cover:       input.Cover,
		AuthorID:    userID,
		CategoryID:  input.CategoryID,
		Status:      status,
		PublishedAt: publishedAt,
	}

	tx := models.DB.Begin()
	if err := tx.Create(&post).Error; err != nil {
		tx.Rollback()
		utils.Error(c, 500, "创建失败")
		return
	}

	// handle tags
	syncTags(tx, &post, input.Tags)

	// update category post count
	updateCategoryPostCount(tx, post.CategoryID)

	tx.Commit()

	models.DB.Preload("Author").Preload("Category").Preload("Tags").First(&post, post.ID)
	utils.Success(c, post)
}

func UpdatePost(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		utils.Error(c, 404, "文章不存在")
		return
	}

	var post models.Post
	if err := models.DB.First(&post, id).Error; err != nil {
		utils.Error(c, 404, "文章不存在")
		return
	}

	// check ownership
	userID := c.GetUint("userId")
	role, _ := c.Get("role")
	if post.AuthorID != userID && role != "admin" {
		utils.Error(c, 403, "权限不足")
		return
	}

	var input postInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.Error(c, 400, "参数错误")
		return
	}

	tx := models.DB.Begin()

	updates := map[string]interface{}{
		"title":       input.Title,
		"content":     input.Content,
		"summary":     input.Summary,
		"cover":       input.Cover,
		"category_id": input.CategoryID,
		"status":      input.Status,
	}

	if input.Title != post.Title {
		slug := slugify(input.Title)
		var c int64
		models.DB.Model(&models.Post{}).Where("slug = ? AND id != ?", slug, id).Count(&c)
		if c > 0 {
			slug = slug + "-" + strconv.FormatInt(time.Now().UnixMilli(), 10)
		}
		updates["slug"] = slug
	}

	if input.Status == "published" && post.Status != "published" {
		now := time.Now()
		updates["published_at"] = &now
	}

	if err := tx.Model(&post).Updates(updates).Error; err != nil {
		tx.Rollback()
		utils.Error(c, 500, "更新失败")
		return
	}

	// update tags
	tx.Where("post_id = ?", post.ID).Delete(&models.PostTag{})
	syncTags(tx, &post, input.Tags)

	// update category post counts
	updateCategoryPostCount(tx, post.CategoryID)
	updateCategoryPostCount(tx, input.CategoryID)

	tx.Commit()

	models.DB.Preload("Author").Preload("Category").Preload("Tags").First(&post, post.ID)
	utils.Success(c, post)
}

func DeletePost(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		utils.Error(c, 404, "文章不存在")
		return
	}

	var post models.Post
	if err := models.DB.First(&post, id).Error; err != nil {
		utils.Error(c, 404, "文章不存在")
		return
	}

	userID := c.GetUint("userId")
	role, _ := c.Get("role")
	if post.AuthorID != userID && role != "admin" {
		utils.Error(c, 403, "权限不足")
		return
	}

	tx := models.DB.Begin()
	tx.Delete(&post)
	tx.Where("post_id = ?", post.ID).Delete(&models.PostTag{})
	tx.Where("post_id = ?", post.ID).Delete(&models.Comment{})
	updateCategoryPostCount(tx, post.CategoryID)
	tx.Commit()

	utils.Success(c, nil)
}

func GetDrafts(c *gin.Context) {
	userID := c.GetUint("userId")
	page, pageSize := utils.GetPageParams(c)

	query := models.DB.Model(&models.Post{}).Preload("Author").Preload("Category").Preload("Tags").
		Where("author_id = ? AND status = ?", userID, "draft").
		Order("updated_at DESC")

	var total int64
	query.Count(&total)

	var posts []models.Post
	query.Offset((page - 1) * pageSize).Limit(pageSize).Find(&posts)

	utils.Paginated(c, posts, total, page, pageSize)
}

func PinPost(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		utils.Error(c, 404, "文章不存在")
		return
	}

	var post models.Post
	if err := models.DB.First(&post, id).Error; err != nil {
		utils.Error(c, 404, "文章不存在")
		return
	}

	pinned := !post.Pinned
	models.DB.Model(&post).Update("pinned", pinned)

	utils.Success(c, gin.H{"pinned": pinned})
}

func syncTags(tx *gorm.DB, post *models.Post, tagNames []string) {
	for _, name := range tagNames {
		if name == "" {
			continue
		}
		slug := slugify(name)
		var tag models.Tag
		if err := tx.Where("slug = ?", slug).First(&tag).Error; err != nil {
			tag = models.Tag{Name: name, Slug: slug}
			tx.Create(&tag)
		}
		tx.Create(&models.PostTag{PostID: post.ID, TagID: tag.ID})
		tx.Model(&tag).Update("post_count", tag.PostCount+1)
	}
}

func updateCategoryPostCount(tx *gorm.DB, categoryID *uint) {
	if categoryID == nil {
		return
	}
	var count int64
	tx.Model(&models.Post{}).Where("category_id = ? AND status = ? AND deleted_at IS NULL", *categoryID, "published").Count(&count)
	tx.Model(&models.Category{}).Where("id = ?", *categoryID).Update("post_count", count)
}
