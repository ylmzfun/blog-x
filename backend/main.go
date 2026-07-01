package main

import (
	"log"
	"os"

	"backend/config"
	"backend/handlers"
	"backend/middleware"
	"backend/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	cfg := config.Load()

	// ensure upload directory exists
	os.MkdirAll(cfg.UploadDir, 0755)

	// init database
	models.InitDB(cfg.DBPath)

	// seed admin user if not exists
	seedAdmin()

	router := gin.Default()

	// CORS
	router.Use(handlers.CORSMiddleware)

	// static uploads
	router.Static("/uploads", cfg.UploadDir)

	// public health check
	router.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "pong"})
	})

	api := router.Group("/api")

	// Auth routes
	auth := api.Group("/auth")
	{
		auth.POST("/register", middleware.RateLimit(10), handlers.Register)
		auth.POST("/login", middleware.RateLimit(20), handlers.Login)
		auth.POST("/refresh", handlers.Refresh)
		auth.POST("/forgot-password", middleware.RateLimit(5), handlers.ForgotPassword)
		auth.POST("/reset-password", handlers.ResetPassword)
		auth.POST("/logout", middleware.Auth(), handlers.Logout)
	}

	// User routes
	users := api.Group("/users")
	{
		users.GET("/me", middleware.Auth(), handlers.GetMe)
		users.PUT("/me", middleware.Auth(), handlers.UpdateMe)
		users.PUT("/me/password", middleware.Auth(), handlers.UpdatePassword)
		users.GET("/:id", handlers.GetUserPublic)
	}

	// Post routes
	posts := api.Group("/posts")
	{
		posts.GET("/drafts", middleware.Auth(), handlers.GetDrafts)
		posts.GET("", handlers.GetPosts)
		posts.GET("/:slug", handlers.GetPostBySlug)
		posts.POST("", middleware.Auth(), middleware.AuthorOrAdmin(), handlers.CreatePost)
		posts.PUT("/:id", middleware.Auth(), handlers.UpdatePost)
		posts.DELETE("/:id", middleware.Auth(), handlers.DeletePost)
		posts.PUT("/:id/pin", middleware.Auth(), middleware.AdminOnly(), handlers.PinPost)
	}

	// Comment routes
	comments := api.Group("/comments")
	{
		comments.GET("", handlers.GetComments)
		comments.POST("", middleware.Auth(), middleware.RateLimit(30), handlers.CreateComment)
		comments.DELETE("/:id", middleware.Auth(), handlers.DeleteComment)
		comments.PUT("/:id/approve", middleware.Auth(), middleware.AdminOnly(), handlers.ApproveComment)
	}

	// Category routes
	categories := api.Group("/categories")
	{
		categories.GET("", handlers.GetCategories)
		categories.GET("/:slug", handlers.GetCategoryBySlug)
		categories.POST("", middleware.Auth(), middleware.AdminOnly(), handlers.CreateCategory)
		categories.PUT("/:id", middleware.Auth(), middleware.AdminOnly(), handlers.UpdateCategory)
		categories.DELETE("/:id", middleware.Auth(), middleware.AdminOnly(), handlers.DeleteCategory)
	}

	// Tag routes
	tags := api.Group("/tags")
	{
		tags.GET("", handlers.GetTags)
		tags.POST("", middleware.Auth(), middleware.AuthorOrAdmin(), handlers.CreateTag)
		tags.DELETE("/:id", middleware.Auth(), middleware.AdminOnly(), handlers.DeleteTag)
	}

	// Search routes
	search := api.Group("/search")
	{
		search.GET("", handlers.Search)
		search.GET("/suggestions", handlers.SearchSuggestions)
	}

	// Stats routes
	stats := api.Group("/stats")
	{
		stats.GET("/overview", middleware.Auth(), middleware.AdminOnly(), handlers.GetOverview)
		stats.GET("/posts/top", middleware.Auth(), middleware.AdminOnly(), handlers.GetTopPosts)
	}

	// Upload routes
	upload := api.Group("/upload")
	{
		upload.POST("/image", middleware.Auth(), handlers.UploadImage)
		upload.POST("/avatar", middleware.Auth(), handlers.UploadAvatar)
	}

	log.Printf("Server starting on :%s", cfg.Port)
	router.Run(":" + cfg.Port)
}

func seedAdmin() {
	var count int64
	models.DB.Model(&models.User{}).Where("role = ?", "admin").Count(&count)
	if count == 0 {
		hash, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
		models.DB.Create(&models.User{
			Username:     "admin",
			Email:        "admin@blog.local",
			PasswordHash: string(hash),
			Role:         "admin",
		})
		log.Println("Default admin created. Login: admin / admin123")
	}
}
