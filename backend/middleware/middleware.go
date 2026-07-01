package middleware

import (
	"strings"

	"backend/config"
	"backend/utils"

	"github.com/gin-gonic/gin"
)

func Auth() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			utils.Error(c, 401, "未登录或 token 已失效")
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			utils.Error(c, 401, "未登录或 token 已失效")
			c.Abort()
			return
		}

		cfg := config.Load()
		claims, err := utils.ParseToken(parts[1], cfg.JWTSecret)
		if err != nil {
			utils.Error(c, 401, "未登录或 token 已失效")
			c.Abort()
			return
		}

		c.Set("userId", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("role", claims.Role)
		c.Next()
	}
}

func OptionalAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.Next()
			return
		}

		cfg := config.Load()
		claims, err := utils.ParseToken(parts[1], cfg.JWTSecret)
		if err != nil {
			c.Next()
			return
		}

		c.Set("userId", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("role", claims.Role)
		c.Next()
	}
}

func AdminOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists || role.(string) != "admin" {
			utils.Error(c, 403, "权限不足")
			c.Abort()
			return
		}
		c.Next()
	}
}

func AuthorOrAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists || (role.(string) != "admin" && role.(string) != "author") {
			utils.Error(c, 403, "权限不足")
			c.Abort()
			return
		}
		c.Next()
	}
}

func RateLimit(maxPerMin int) gin.HandlerFunc {
	var visitors = make(map[string][]int64)

	return func(c *gin.Context) {
		ip := c.ClientIP()
		now := utils.CurrentTimestamp()

		// clean old entries
		visitors[ip] = filterOld(visitors[ip], now)

		if len(visitors[ip]) >= maxPerMin {
			utils.Error(c, 429, "请求过于频繁，请稍后再试")
			c.Abort()
			return
		}

		visitors[ip] = append(visitors[ip], now)
		c.Next()
	}
}

func filterOld(timestamps []int64, now int64) []int64 {
	var result []int64
	for _, ts := range timestamps {
		if now-ts < 60 {
			result = append(result, ts)
		}
	}
	return result
}
