package fun.ylmz.blogspringboot.repository;

import fun.ylmz.blogspringboot.model.entity.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    Page<Comment> findByPostIdAndParentIdIsNullAndDeletedAtIsNull(Long postId, Pageable pageable);

    List<Comment> findByPostIdAndParentIdIsNullAndDeletedAtIsNull(Long postId);

    List<Comment> findByParentIdAndDeletedAtIsNull(Long parentId);

    Page<Comment> findByDeletedAtIsNull(Pageable pageable);

    long countByStatusAndDeletedAtIsNull(Comment.CommentStatus status);

    long countByDeletedAtIsNull();

    @Modifying
    @Query("UPDATE Comment c SET c.status = :status WHERE c.id = :id")
    void updateStatus(@Param("id") Long id, @Param("status") Comment.CommentStatus status);
}
