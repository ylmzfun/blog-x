package fun.ylmz.blogspringboot.controller;

import fun.ylmz.blogspringboot.common.PageResult;
import fun.ylmz.blogspringboot.common.Result;
import fun.ylmz.blogspringboot.model.dto.CreatePostRequest;
import fun.ylmz.blogspringboot.model.entity.User;
import fun.ylmz.blogspringboot.model.vo.PostVO;
import fun.ylmz.blogspringboot.service.PostService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;

    @GetMapping
    public Result<PageResult<PostVO>> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(defaultValue = "latest") String sort) {
        Page<PostVO> result = postService.list(page, pageSize, sort);
        return Result.success(new PageResult<>(
                result.getContent(), result.getTotalElements(), page, pageSize));
    }

    @GetMapping("/drafts")
    public Result<PageResult<PostVO>> drafts(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize) {
        Page<PostVO> result = postService.listDrafts(user, page, pageSize);
        return Result.success(new PageResult<>(
                result.getContent(), result.getTotalElements(), page, pageSize));
    }

    @GetMapping("/pinned")
    public Result<List<PostVO>> pinned() {
        return Result.success(postService.pinnedPosts());
    }

    @GetMapping("/{slug}")
    public Result<PostVO> detail(@PathVariable String slug) {
        return Result.success(postService.getBySlug(slug));
    }

    @PostMapping
    public Result<PostVO> create(@AuthenticationPrincipal User user,
                                 @Valid @RequestBody CreatePostRequest request) {
        return Result.success(postService.create(request, user));
    }

    @PutMapping("/{id}")
    public Result<PostVO> update(@AuthenticationPrincipal User user,
                                 @PathVariable Long id,
                                 @Valid @RequestBody CreatePostRequest request) {
        return Result.success(postService.update(id, request, user));
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@AuthenticationPrincipal User user, @PathVariable Long id) {
        postService.delete(id, user);
        return Result.success();
    }

    @PutMapping("/{id}/pin")
    public Result<Void> togglePin(@PathVariable Long id) {
        postService.togglePin(id);
        return Result.success();
    }
}
