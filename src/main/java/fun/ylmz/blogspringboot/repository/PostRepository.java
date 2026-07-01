package fun.ylmz.blogspringboot.repository;

import fun.ylmz.blogspringboot.model.entity.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PostRepository extends JpaRepository<Post, Long>, JpaSpecificationExecutor<Post> {

    Optional<Post> findBySlugAndDeletedAtIsNull(String slug);

    Page<Post> findByDeletedAtIsNull(Pageable pageable);

    Page<Post> findByStatusAndDeletedAtIsNull(Post.Status status, Pageable pageable);

    Page<Post> findByAuthorIdAndDeletedAtIsNull(Long authorId, Pageable pageable);

    Page<Post> findByCategoryIdAndDeletedAtIsNull(Long categoryId, Pageable pageable);

    Page<Post> findByCategorySlugAndDeletedAtIsNull(String slug, Pageable pageable);

    @Query("SELECT p FROM Post p JOIN p.tags t WHERE t.slug = :tagSlug AND p.deletedAt IS NULL")
    Page<Post> findByTagSlugAndDeletedAtIsNull(@Param("tagSlug") String tagSlug, Pageable pageable);

    List<Post> findByPinnedTrueAndDeletedAtIsNullOrderByPublishedAtDesc();

    List<Post> findTop10ByDeletedAtIsNullOrderByViewCountDesc();

    @Query("SELECT p FROM Post p WHERE p.deletedAt IS NULL AND " +
            "(p.title LIKE %:keyword% OR p.content LIKE %:keyword%)")
    Page<Post> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);

    long countByDeletedAtIsNull();

    @Modifying
    @Query("UPDATE Post p SET p.viewCount = p.viewCount + 1 WHERE p.id = :id")
    void incrementViewCount(@Param("id") Long id);

    @Modifying
    @Query("UPDATE Post p SET p.commentCount = p.commentCount + 1 WHERE p.id = :id")
    void incrementCommentCount(@Param("id") Long id);

    @Modifying
    @Query("UPDATE Post p SET p.commentCount = p.commentCount - 1 WHERE p.id = :id AND p.commentCount > 0")
    void decrementCommentCount(@Param("id") Long id);
}
