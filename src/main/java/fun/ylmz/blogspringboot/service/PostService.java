package fun.ylmz.blogspringboot.service;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fun.ylmz.blogspringboot.common.BusinessException;
import fun.ylmz.blogspringboot.model.dto.CreatePostRequest;
import fun.ylmz.blogspringboot.model.entity.Category;
import fun.ylmz.blogspringboot.model.entity.Post;
import fun.ylmz.blogspringboot.model.entity.Tag;
import fun.ylmz.blogspringboot.model.entity.User;
import fun.ylmz.blogspringboot.model.vo.CategoryVO;
import fun.ylmz.blogspringboot.model.vo.PostVO;
import fun.ylmz.blogspringboot.model.vo.TagVO;
import fun.ylmz.blogspringboot.model.vo.UserVO;
import fun.ylmz.blogspringboot.repository.CategoryRepository;
import fun.ylmz.blogspringboot.repository.PostRepository;
import fun.ylmz.blogspringboot.repository.TagRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PostService {

    private final PostRepository postRepository;
    private final CategoryRepository categoryRepository;
    private final TagRepository tagRepository;

    @Transactional
    public PostVO getBySlug(String slug) {
        Post post = postRepository.findBySlugAndDeletedAtIsNull(slug)
                .orElseThrow(() -> new BusinessException(404, "文章不存在"));
        postRepository.incrementViewCount(post.getId());
        post.setViewCount(post.getViewCount() + 1);
        return toVO(post);
    }

    public Page<PostVO> list(int page, int pageSize, String sort) {
        Sort s = "hot".equals(sort)
                ? Sort.by(Sort.Direction.DESC, "viewCount")
                : Sort.by(Sort.Direction.DESC, "publishedAt");
        Pageable pageable = PageRequest.of(page - 1, pageSize, s);
        Page<Post> posts = postRepository.findByStatusAndDeletedAtIsNull(Post.Status.PUBLISHED, pageable);
        return posts.map(this::toVO);
    }

    public List<PostVO> pinnedPosts() {
        return postRepository.findByPinnedTrueAndDeletedAtIsNullOrderByPublishedAtDesc()
                .stream().map(this::toVO).collect(Collectors.toList());
    }

    @Transactional
    public PostVO create(CreatePostRequest request, User author) {
        Post post = new Post();
        post.setTitle(request.getTitle());
        post.setSlug(generateSlug(request.getTitle()));
        post.setContent(request.getContent());
        post.setSummary(request.getSummary());
        post.setCover(request.getCover());
        post.setAuthor(author);

        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new BusinessException(404, "分类不存在"));
            post.setCategory(category);
        }

        if (request.getTagIds() != null && !request.getTagIds().isEmpty()) {
            Set<Tag> tags = new HashSet<>(tagRepository.findAllById(request.getTagIds()));
            post.setTags(tags);
        }

        if ("PUBLISHED".equalsIgnoreCase(request.getStatus())) {
            post.setStatus(Post.Status.PUBLISHED);
            post.setPublishedAt(LocalDateTime.now());
            if (post.getCategory() != null) {
                post.getCategory().setPostCount(post.getCategory().getPostCount() + 1);
            }
        } else {
            post.setStatus(Post.Status.DRAFT);
        }

        return toVO(postRepository.save(post));
    }

    @Transactional
    public PostVO update(Long id, CreatePostRequest request, User currentUser) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "文章不存在"));

        if (!post.getAuthor().getId().equals(currentUser.getId())
                && currentUser.getRole() != User.Role.ADMIN) {
            throw new BusinessException(403, "无权修改此文章");
        }

        post.setTitle(request.getTitle());
        post.setContent(request.getContent());
        post.setSummary(request.getSummary());
        post.setCover(request.getCover());

        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new BusinessException(404, "分类不存在"));
            post.setCategory(category);
        }

        if (request.getTagIds() != null) {
            Set<Tag> tags = new HashSet<>(tagRepository.findAllById(request.getTagIds()));
            post.setTags(tags);
        }

        if ("PUBLISHED".equalsIgnoreCase(request.getStatus()) && post.getStatus() == Post.Status.DRAFT) {
            post.setStatus(Post.Status.PUBLISHED);
            post.setPublishedAt(LocalDateTime.now());
        }

        return toVO(postRepository.save(post));
    }

    @Transactional
    public void delete(Long id, User currentUser) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "文章不存在"));

        if (!post.getAuthor().getId().equals(currentUser.getId())
                && currentUser.getRole() != User.Role.ADMIN) {
            throw new BusinessException(403, "无权删除此文章");
        }

        post.setDeletedAt(LocalDateTime.now());
        postRepository.save(post);
    }

    @Transactional
    public void togglePin(Long id) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "文章不存在"));
        post.setPinned(!post.isPinned());
        postRepository.save(post);
    }

    public Page<PostVO> listDrafts(User user, int page, int pageSize) {
        Pageable pageable = PageRequest.of(page - 1, pageSize, Sort.by(Sort.Direction.DESC, "updatedAt"));
        return postRepository.findByAuthorIdAndDeletedAtIsNull(user.getId(), pageable)
                .map(this::toVO);
    }

    public Page<PostVO> listByCategory(String slug, int page, int pageSize) {
        Pageable pageable = PageRequest.of(page - 1, pageSize, Sort.by(Sort.Direction.DESC, "publishedAt"));
        return postRepository.findByCategorySlugAndDeletedAtIsNull(slug, pageable)
                .map(this::toVO);
    }

    public Page<PostVO> listByTag(String slug, int page, int pageSize) {
        Pageable pageable = PageRequest.of(page - 1, pageSize, Sort.by(Sort.Direction.DESC, "publishedAt"));
        return postRepository.findByTagSlugAndDeletedAtIsNull(slug, pageable)
                .map(this::toVO);
    }

    public List<PostVO> topPosts() {
        return postRepository.findTop10ByDeletedAtIsNullOrderByViewCountDesc()
                .stream().map(this::toVO).collect(Collectors.toList());
    }

    public PostVO getById(Long id) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "文章不存在"));
        return toVO(post);
    }

    public Page<PostVO> listAll(int page, int pageSize) {
        Pageable pageable = PageRequest.of(page - 1, pageSize, Sort.by(Sort.Direction.DESC, "updatedAt"));
        return postRepository.findByDeletedAtIsNull(pageable).map(this::toVO);
    }

    public PostVO toVO(Post post) {
        UserVO authorVO = post.getAuthor() != null ? UserVO.builder()
                .id(post.getAuthor().getId())
                .username(post.getAuthor().getUsername())
                .avatar(post.getAuthor().getAvatar())
                .build() : null;

        CategoryVO categoryVO = post.getCategory() != null ? CategoryVO.builder()
                .id(post.getCategory().getId())
                .name(post.getCategory().getName())
                .slug(post.getCategory().getSlug())
                .build() : null;

        List<TagVO> tagVOs = post.getTags() != null ? post.getTags().stream()
                .map(t -> TagVO.builder().id(t.getId()).name(t.getName()).slug(t.getSlug()).build())
                .collect(Collectors.toList()) : List.of();

        return PostVO.builder()
                .id(post.getId())
                .title(post.getTitle())
                .slug(post.getSlug())
                .content(post.getContent())
                .summary(post.getSummary())
                .cover(post.getCover())
                .author(authorVO)
                .category(categoryVO)
                .tags(tagVOs)
                .status(post.getStatus().name())
                .pinned(post.isPinned())
                .viewCount(post.getViewCount())
                .commentCount(post.getCommentCount())
                .publishedAt(post.getPublishedAt())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .build();
    }

    private String generateSlug(String title) {
        String slug = title.toLowerCase()
                .replaceAll("[^a-z0-9\\u4e00-\\u9fa5]+", "-")
                .replaceAll("^-|-$", "");
        if (slug.length() > 200) slug = slug.substring(0, 200);
        // Append timestamp to ensure uniqueness
        slug += "-" + System.currentTimeMillis() % 100000;
        return slug;
    }
}
