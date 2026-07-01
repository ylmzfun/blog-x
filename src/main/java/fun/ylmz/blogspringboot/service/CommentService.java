package fun.ylmz.blogspringboot.service;

import fun.ylmz.blogspringboot.common.BusinessException;
import fun.ylmz.blogspringboot.model.entity.Comment;
import fun.ylmz.blogspringboot.model.entity.Post;
import fun.ylmz.blogspringboot.model.entity.User;
import fun.ylmz.blogspringboot.model.vo.CommentVO;
import fun.ylmz.blogspringboot.model.vo.UserVO;
import fun.ylmz.blogspringboot.repository.CommentRepository;
import fun.ylmz.blogspringboot.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;

    public Page<CommentVO> listByPost(Long postId, int page, int pageSize) {
        Pageable pageable = PageRequest.of(page - 1, pageSize, Sort.by(Sort.Direction.ASC, "createdAt"));
        Page<Comment> comments = commentRepository.findByPostIdAndParentIdIsNullAndDeletedAtIsNull(postId, pageable);
        return comments.map(this::toVO);
    }

    @Transactional
    public CommentVO create(Long postId, String content, Long parentId, User author) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new BusinessException(404, "文章不存在"));

        if (parentId != null && !commentRepository.existsById(parentId)) {
            throw new BusinessException(404, "父评论不存在");
        }

        Comment comment = new Comment();
        comment.setPost(post);
        comment.setAuthor(author);
        comment.setContent(content);
        comment.setParentId(parentId);

        postRepository.incrementCommentCount(postId);
        return toVO(commentRepository.save(comment));
    }

    @Transactional
    public void delete(Long id, User currentUser) {
        Comment comment = commentRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "评论不存在"));

        if (!comment.getAuthor().getId().equals(currentUser.getId())
                && currentUser.getRole() != User.Role.ADMIN) {
            throw new BusinessException(403, "无权删除此评论");
        }

        comment.setDeletedAt(LocalDateTime.now());
        commentRepository.save(comment);
        postRepository.decrementCommentCount(comment.getPost().getId());
    }

    @Transactional
    public void approve(Long id) {
        Comment comment = commentRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "评论不存在"));
        comment.setStatus(Comment.CommentStatus.APPROVED);
        commentRepository.save(comment);
    }

    @Transactional
    public CommentVO createWithUserId(Long postId, String content, Long parentId, Long userId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new BusinessException(404, "文章不存在"));

        if (parentId != null && !commentRepository.existsById(parentId)) {
            throw new BusinessException(404, "父评论不存在");
        }

        Comment comment = new Comment();
        comment.setPost(post);
        User author = new User();
        author.setId(userId);
        comment.setAuthor(author);
        comment.setContent(content);
        comment.setParentId(parentId);

        postRepository.incrementCommentCount(postId);
        return toVO(commentRepository.save(comment));
    }

    public Page<CommentVO> listAll(int page, int pageSize) {
        Pageable pageable = PageRequest.of(page - 1, pageSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        return commentRepository.findByDeletedAtIsNull(pageable).map(this::toSimpleVO);
    }

    @Transactional
    public void deleteByAdmin(Long id) {
        Comment comment = commentRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "评论不存在"));
        comment.setDeletedAt(LocalDateTime.now());
        commentRepository.save(comment);
    }

    private CommentVO toSimpleVO(Comment comment) {
        return CommentVO.builder()
                .id(comment.getId())
                .content(comment.getContent())
                .author(comment.getAuthor() != null ? UserVO.builder()
                        .id(comment.getAuthor().getId())
                        .username(comment.getAuthor().getUsername())
                        .build() : null)
                .status(comment.getStatus().name())
                .createdAt(comment.getCreatedAt())
                .build();
    }

    public CommentVO toVO(Comment comment) {
        UserVO authorVO = UserVO.builder()
                .id(comment.getAuthor().getId())
                .username(comment.getAuthor().getUsername())
                .avatar(comment.getAuthor().getAvatar())
                .build();

        List<CommentVO> children = List.of();
        if (comment.getParentId() == null) {
            List<Comment> childComments = commentRepository.findByParentIdAndDeletedAtIsNull(comment.getId());
            children = childComments.stream().map(this::toVO).collect(Collectors.toList());
        }

        return CommentVO.builder()
                .id(comment.getId())
                .content(comment.getContent())
                .author(authorVO)
                .parentId(comment.getParentId())
                .status(comment.getStatus().name())
                .children(children)
                .createdAt(comment.getCreatedAt())
                .build();
    }
}
