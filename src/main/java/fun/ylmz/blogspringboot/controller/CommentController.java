package fun.ylmz.blogspringboot.controller;

import fun.ylmz.blogspringboot.common.PageResult;
import fun.ylmz.blogspringboot.common.Result;
import fun.ylmz.blogspringboot.model.dto.CreateCommentRequest;
import fun.ylmz.blogspringboot.model.entity.User;
import fun.ylmz.blogspringboot.model.vo.CommentVO;
import fun.ylmz.blogspringboot.service.CommentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    @GetMapping("/api/posts/{postId}/comments")
    public Result<PageResult<CommentVO>> list(@PathVariable Long postId,
                                              @RequestParam(defaultValue = "1") int page,
                                              @RequestParam(defaultValue = "10") int pageSize) {
        Page<CommentVO> result = commentService.listByPost(postId, page, pageSize);
        return Result.success(new PageResult<>(
                result.getContent(), result.getTotalElements(), page, pageSize));
    }

    @PostMapping("/api/posts/{postId}/comments")
    public Result<CommentVO> create(@AuthenticationPrincipal User user,
                                    @PathVariable Long postId,
                                    @Valid @RequestBody CreateCommentRequest request) {
        return Result.success(commentService.create(postId, request.getContent(), request.getParentId(), user));
    }

    @DeleteMapping("/api/comments/{id}")
    public Result<Void> delete(@AuthenticationPrincipal User user, @PathVariable Long id) {
        commentService.delete(id, user);
        return Result.success();
    }

    @PutMapping("/api/comments/{id}/approve")
    public Result<Void> approve(@PathVariable Long id) {
        commentService.approve(id);
        return Result.success();
    }
}
