package fun.ylmz.blogspringboot.controller;

import fun.ylmz.blogspringboot.common.BusinessException;
import fun.ylmz.blogspringboot.common.PageResult;
import fun.ylmz.blogspringboot.model.dto.*;
import fun.ylmz.blogspringboot.model.entity.User;
import fun.ylmz.blogspringboot.model.vo.*;
import fun.ylmz.blogspringboot.service.*;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Controller
@RequiredArgsConstructor
public class WebController {

    private final PostService postService;
    private final CategoryService categoryService;
    private final TagService tagService;
    private final CommentService commentService;
    private final AuthService authService;
    private final UserService userService;
    private final SearchService searchService;
    private final StatsService statsService;

    // ==================== Auth ====================

    @GetMapping("/login")
    public String loginPage() {
        return "login";
    }

    @PostMapping("/login")
    public String login(@RequestParam String account, @RequestParam String password,
                        HttpSession session, RedirectAttributes ra) {
        try {
            LoginRequest req = new LoginRequest();
            req.setAccount(account);
            req.setPassword(password);
            LoginResponse resp = authService.login(req);
            // Also get user info via parsing token
            User user = authService.findUserByAccount(account);
            UserVO userVO = userService.toVO(user);
            session.setAttribute("user", userVO);
            session.setAttribute("token", resp.getAccessToken());
            return "redirect:/";
        } catch (BusinessException e) {
            ra.addFlashAttribute("error", e.getMessage());
            return "redirect:/login";
        }
    }

    @GetMapping("/register")
    public String registerPage() {
        return "register";
    }

    @PostMapping("/register")
    public String register(@RequestParam String username,
                           @RequestParam String email,
                           @RequestParam String password,
                           RedirectAttributes ra) {
        try {
            RegisterRequest req = new RegisterRequest();
            req.setUsername(username);
            req.setEmail(email);
            req.setPassword(password);
            authService.register(req);
            ra.addFlashAttribute("success", "注册成功，请登录");
            return "redirect:/login";
        } catch (BusinessException e) {
            ra.addFlashAttribute("error", e.getMessage());
            return "redirect:/register";
        }
    }

    @GetMapping("/logout")
    public String logout(HttpSession session) {
        session.invalidate();
        return "redirect:/";
    }

    // ==================== Frontend Pages ====================

    @GetMapping("/")
    public String index(Model model,
                        @RequestParam(defaultValue = "1") int page,
                        @RequestParam(defaultValue = "10") int pageSize,
                        @RequestParam(defaultValue = "latest") String sort) {
        Page<PostVO> posts = postService.list(page, pageSize, sort);
        List<PostVO> pinnedPosts = postService.pinnedPosts();
        List<CategoryVO> categories = categoryService.list();

        model.addAttribute("title", "首页");
        model.addAttribute("posts", new PageResult<>(posts.getContent(), posts.getTotalElements(), page, pageSize));
        model.addAttribute("pinnedPosts", pinnedPosts);
        model.addAttribute("categories", categories);
        model.addAttribute("pages", posts.getTotalPages());
        model.addAttribute("currentCategory", null);
        return "index";
    }

    @GetMapping("/post/{slug}")
    public String postDetail(@PathVariable String slug, Model model,
                              @RequestParam(defaultValue = "1") int page,
                              @RequestParam(defaultValue = "10") int pageSize) {
        PostVO post = postService.getBySlug(slug);
        Page<CommentVO> comments = commentService.listByPost(post.getId(), page, pageSize);

        model.addAttribute("post", post);
        model.addAttribute("comments", new PageResult<>(comments.getContent(), comments.getTotalElements(), page, pageSize));
        model.addAttribute("commentPages", comments.getTotalPages());
        return "post-detail";
    }

    @PostMapping("/post/{slug}/comment")
    public String postComment(@PathVariable String slug,
                              @RequestParam String content,
                              @RequestParam(required = false) Long parentId,
                              HttpSession session, RedirectAttributes ra) {
        UserVO userVO = (UserVO) session.getAttribute("user");
        if (userVO == null) {
            return "redirect:/login";
        }
        try {
            PostVO post = postService.getBySlug(slug);
            // We need the actual User entity; use a simple approach
            commentService.createWithUserId(post.getId(), content, parentId, userVO.getId());
        } catch (BusinessException e) {
            ra.addFlashAttribute("error", e.getMessage());
        }
        return "redirect:/post/" + slug;
    }

    @GetMapping("/category/{slug}")
    public String category(@PathVariable String slug, Model model,
                           @RequestParam(defaultValue = "1") int page,
                           @RequestParam(defaultValue = "10") int pageSize) {
        CategoryVO category = categoryService.getBySlug(slug);
        Page<PostVO> posts = postService.listByCategory(slug, page, pageSize);

        model.addAttribute("category", category);
        model.addAttribute("posts", new PageResult<>(posts.getContent(), posts.getTotalElements(), page, pageSize));
        model.addAttribute("pages", posts.getTotalPages());
        return "category";
    }

    @GetMapping("/tag/{slug}")
    public String tag(@PathVariable String slug, Model model,
                      @RequestParam(defaultValue = "1") int page,
                      @RequestParam(defaultValue = "10") int pageSize) {
        Page<PostVO> posts = postService.listByTag(slug, page, pageSize);

        model.addAttribute("slug", slug);
        model.addAttribute("posts", new PageResult<>(posts.getContent(), posts.getTotalElements(), page, pageSize));
        model.addAttribute("pages", posts.getTotalPages());
        return "tag";
    }

    @GetMapping("/search")
    public String search(@RequestParam(required = false) String q, Model model,
                         @RequestParam(defaultValue = "1") int page,
                         @RequestParam(defaultValue = "10") int pageSize) {
        if (q == null || q.isBlank()) {
            model.addAttribute("keyword", "");
            model.addAttribute("results", new PageResult<>(List.of(), 0, page, pageSize));
            model.addAttribute("pages", 0);
        } else {
            Page<SearchResultVO> results = searchService.search(q, page, pageSize);
            model.addAttribute("keyword", q);
            model.addAttribute("results", new PageResult<>(results.getContent(), results.getTotalElements(), page, pageSize));
            model.addAttribute("pages", results.getTotalPages());
        }
        return "search";
    }

    // ==================== Profile ====================

    @GetMapping("/profile")
    public String profile(HttpSession session, Model model) {
        UserVO userVO = requireLogin(session);
        if (userVO == null) return "redirect:/login";
        model.addAttribute("user", userVO);
        return "profile";
    }

    @PostMapping("/profile")
    public String updateProfile(@RequestParam String username,
                                @RequestParam(required = false) String bio,
                                @RequestParam(required = false) String website,
                                @RequestParam(required = false) String avatar,
                                HttpSession session, RedirectAttributes ra) {
        UserVO userVO = requireLogin(session);
        if (userVO == null) return "redirect:/login";
        try {
            UpdateUserRequest req = new UpdateUserRequest();
            req.setNickname(username);
            req.setBio(bio);
            req.setWebsite(website);
            req.setAvatar(avatar);
            UserVO updated = userService.updateCurrentUserById(userVO.getId(), req);
            session.setAttribute("user", updated);
            ra.addFlashAttribute("success", "修改成功");
        } catch (BusinessException e) {
            ra.addFlashAttribute("error", e.getMessage());
        }
        return "redirect:/profile";
    }

    @PostMapping("/profile/password")
    public String changePassword(@RequestParam String oldPassword,
                                 @RequestParam String newPassword,
                                 HttpSession session, RedirectAttributes ra) {
        UserVO userVO = requireLogin(session);
        if (userVO == null) return "redirect:/login";
        try {
            userService.changePasswordById(userVO.getId(), oldPassword, newPassword);
            ra.addFlashAttribute("success", "密码修改成功");
        } catch (BusinessException e) {
            ra.addFlashAttribute("error", e.getMessage());
        }
        return "redirect:/profile";
    }

    // ==================== Admin ====================

    @GetMapping("/admin")
    public String adminDashboard(HttpSession session, Model model) {
        if (!requireAdmin(session)) return "redirect:/login";
        StatsOverviewVO stats = statsService.overview();
        List<PostVO> topPosts = postService.topPosts();

        model.addAttribute("stats", stats);
        model.addAttribute("topPosts", topPosts);
        model.addAttribute("menu", "dashboard");
        return "admin/dashboard";
    }

    @GetMapping("/admin/posts")
    public String adminPosts(HttpSession session, Model model,
                             @RequestParam(defaultValue = "1") int page,
                             @RequestParam(defaultValue = "10") int pageSize) {
        if (!requireAdmin(session)) return "redirect:/login";
        UserVO userVO = (UserVO) session.getAttribute("user");
        Page<PostVO> posts;
        if ("ADMIN".equals(userVO.getRole())) {
            posts = postService.listAll(page, pageSize);
        } else {
            posts = postService.listDrafts(
                    authService.getUserById(userVO.getId()), page, pageSize);
        }

        model.addAttribute("posts", new PageResult<>(posts.getContent(), posts.getTotalElements(), page, pageSize));
        model.addAttribute("pages", posts.getTotalPages());
        model.addAttribute("menu", "posts");
        return "admin/posts";
    }

    @GetMapping("/admin/posts/new")
    public String newPostForm(HttpSession session, Model model) {
        if (!requireAdmin(session)) return "redirect:/login";
        model.addAttribute("categories", categoryService.list());
        model.addAttribute("tags", tagService.list());
        model.addAttribute("menu", "post-new");
        return "admin/post-form";
    }

    @PostMapping("/admin/posts/new")
    public String createPost(@RequestParam String title,
                             @RequestParam String content,
                             @RequestParam(required = false) String summary,
                             @RequestParam(required = false) String cover,
                             @RequestParam(required = false) Long categoryId,
                             @RequestParam(required = false) Set<Long> tagIds,
                             @RequestParam(defaultValue = "DRAFT") String status,
                             HttpSession session, RedirectAttributes ra) {
        UserVO userVO = requireLogin(session);
        if (userVO == null) return "redirect:/login";
        try {
            CreatePostRequest req = new CreatePostRequest();
            req.setTitle(title);
            req.setContent(content);
            req.setSummary(summary);
            req.setCover(cover);
            req.setCategoryId(categoryId);
            req.setTagIds(tagIds != null ? tagIds : new HashSet<>());
            req.setStatus(status);
            postService.create(req, authService.getUserById(userVO.getId()));
            ra.addFlashAttribute("success", "文章创建成功");
            return "redirect:/admin/posts";
        } catch (BusinessException e) {
            ra.addFlashAttribute("error", e.getMessage());
            return "redirect:/admin/posts/new";
        }
    }

    @GetMapping("/admin/posts/{id}/edit")
    public String editPostForm(@PathVariable Long id, HttpSession session, Model model) {
        if (!requireAdmin(session)) return "redirect:/login";
        PostVO post = postService.getById(id);
        model.addAttribute("post", post);
        model.addAttribute("categories", categoryService.list());
        model.addAttribute("tags", tagService.list());
        model.addAttribute("menu", "posts");
        return "admin/post-form";
    }

    @PostMapping("/admin/posts/{id}/edit")
    public String updatePost(@PathVariable Long id,
                             @RequestParam String title,
                             @RequestParam String content,
                             @RequestParam(required = false) String summary,
                             @RequestParam(required = false) String cover,
                             @RequestParam(required = false) Long categoryId,
                             @RequestParam(required = false) Set<Long> tagIds,
                             @RequestParam String status,
                             HttpSession session, RedirectAttributes ra) {
        UserVO userVO = requireLogin(session);
        if (userVO == null) return "redirect:/login";
        try {
            CreatePostRequest req = new CreatePostRequest();
            req.setTitle(title);
            req.setContent(content);
            req.setSummary(summary);
            req.setCover(cover);
            req.setCategoryId(categoryId);
            req.setTagIds(tagIds != null ? tagIds : new HashSet<>());
            req.setStatus(status);
            postService.update(id, req, authService.getUserById(userVO.getId()));
            ra.addFlashAttribute("success", "文章更新成功");
        } catch (BusinessException e) {
            ra.addFlashAttribute("error", e.getMessage());
        }
        return "redirect:/admin/posts";
    }

    @PostMapping("/admin/posts/{id}/delete")
    public String deletePost(@PathVariable Long id, HttpSession session, RedirectAttributes ra) {
        UserVO userVO = requireLogin(session);
        if (userVO == null) return "redirect:/login";
        try {
            postService.delete(id, authService.getUserById(userVO.getId()));
            ra.addFlashAttribute("success", "文章已删除");
        } catch (BusinessException e) {
            ra.addFlashAttribute("error", e.getMessage());
        }
        return "redirect:/admin/posts";
    }

    @PostMapping("/admin/posts/{id}/pin")
    public String togglePin(@PathVariable Long id, HttpSession session) {
        if (!requireAdmin(session)) return "redirect:/login";
        postService.togglePin(id);
        return "redirect:/admin/posts";
    }

    @GetMapping("/admin/categories")
    public String adminCategories(HttpSession session, Model model) {
        if (!requireAdmin(session)) return "redirect:/login";
        model.addAttribute("categories", categoryService.list());
        model.addAttribute("menu", "categories");
        return "admin/categories";
    }

    @PostMapping("/admin/categories")
    public String createCategory(@RequestParam String name,
                                 @RequestParam String slug,
                                 @RequestParam(required = false) String description,
                                 HttpSession session, RedirectAttributes ra) {
        if (!requireAdmin(session)) return "redirect:/login";
        try {
            CreateCategoryRequest req = new CreateCategoryRequest();
            req.setName(name);
            req.setSlug(slug);
            req.setDescription(description);
            categoryService.create(req);
            ra.addFlashAttribute("success", "分类创建成功");
        } catch (BusinessException e) {
            ra.addFlashAttribute("error", e.getMessage());
        }
        return "redirect:/admin/categories";
    }

    @PostMapping("/admin/categories/{id}/delete")
    public String deleteCategory(@PathVariable Long id, HttpSession session, RedirectAttributes ra) {
        if (!requireAdmin(session)) return "redirect:/login";
        try {
            categoryService.delete(id);
            ra.addFlashAttribute("success", "分类已删除");
        } catch (BusinessException e) {
            ra.addFlashAttribute("error", e.getMessage());
        }
        return "redirect:/admin/categories";
    }

    @GetMapping("/admin/comments")
    public String adminComments(HttpSession session, Model model,
                                @RequestParam(defaultValue = "1") int page,
                                @RequestParam(defaultValue = "15") int pageSize) {
        if (!requireAdmin(session)) return "redirect:/login";
        Page<CommentVO> comments = commentService.listAll(page, pageSize);

        model.addAttribute("comments", new PageResult<>(comments.getContent(), comments.getTotalElements(), page, pageSize));
        model.addAttribute("pages", comments.getTotalPages());
        model.addAttribute("menu", "comments");
        return "admin/comments";
    }

    @PostMapping("/admin/comments/{id}/approve")
    public String approveComment(@PathVariable Long id, HttpSession session) {
        if (!requireAdmin(session)) return "redirect:/login";
        commentService.approve(id);
        return "redirect:/admin/comments";
    }

    @PostMapping("/admin/comments/{id}/delete")
    public String deleteComment(@PathVariable Long id, HttpSession session, RedirectAttributes ra) {
        UserVO userVO = requireLogin(session);
        if (userVO == null) return "redirect:/login";
        try {
            commentService.deleteByAdmin(id);
            ra.addFlashAttribute("success", "评论已删除");
        } catch (BusinessException e) {
            ra.addFlashAttribute("error", e.getMessage());
        }
        return "redirect:/admin/comments";
    }

    @GetMapping("/admin/stats")
    public String adminStats(HttpSession session, Model model) {
        if (!requireAdmin(session)) return "redirect:/login";
        model.addAttribute("stats", statsService.overview());
        model.addAttribute("topPosts", postService.topPosts());
        model.addAttribute("menu", "stats");
        return "admin/stats";
    }

    // ==================== Helpers ====================

    private UserVO requireLogin(HttpSession session) {
        return (UserVO) session.getAttribute("user");
    }

    private boolean requireAdmin(HttpSession session) {
        UserVO userVO = (UserVO) session.getAttribute("user");
        if (userVO == null) return false;
        return "ADMIN".equals(userVO.getRole()) || "AUTHOR".equals(userVO.getRole());
    }
}
