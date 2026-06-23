import { defineService } from "srpc-core/rpc";
import { ReviewService } from "../generated/srpc-types.ts";
import { ReviewStatus } from "../generated/srpc-types.ts";
import { empty, nextId, now, paginate, paginationMeta, requireEntity } from "./helpers.ts";
import { getProduct, store } from "./store.ts";

export const reviewService = defineService(ReviewService, {
  listReviews({ pagination, productId, userId, status, minRating }) {
    const all = [...store.reviews.values()].filter(review => {
      if (productId && review.productId !== productId) {
        return false;
      }
      if (userId && review.userId !== userId) {
        return false;
      }
      if (status && review.status !== status) {
        return false;
      }
      if (minRating !== undefined && review.rating < minRating) {
        return false;
      }
      return true;
    });

    return {
      items: paginate(all, pagination),
      meta: paginationMeta(pagination, all.length),
    };
  },

  getReview({ id }) {
    return requireEntity(store.reviews.get(id), "Review", id);
  },

  createReview(data) {
    const product = requireEntity(getProduct(data.productId), "Product", data.productId);
    const timestamp = now();
    const review = {
      id: nextId("review"),
      productId: data.productId,
      userId: data.userId,
      orderId: data.orderId,
      rating: data.rating,
      title: data.title,
      body: data.body,
      status: ReviewStatus.PENDING,
      helpfulCount: 0,
      images: (data.imageUrls ?? []).map((url, index) => ({
        id: `review-img-${index}`,
        url,
        alt: product.title,
      })),
      verifiedPurchase: Boolean(data.orderId),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    store.reviews.set(review.id, review);
    return review;
  },

  updateReview({ reviewId, ...patch }) {
    const review = requireEntity(store.reviews.get(reviewId), "Review", reviewId);
    Object.assign(review, patch, { updatedAt: now() });
    return review;
  },

  deleteReview({ id }) {
    store.reviews.delete(id);
    return empty();
  },

  moderateReview({ reviewId, status }) {
    const review = requireEntity(store.reviews.get(reviewId), "Review", reviewId);
    review.status = status;
    review.updatedAt = now();
    return review;
  },

  markHelpful({ id }) {
    const review = requireEntity(store.reviews.get(id), "Review", id);
    review.helpfulCount += 1;
    review.updatedAt = now();
    return review;
  },

  getProductRatingSummary({ id: productId }) {
    const reviews = [...store.reviews.values()].filter(
      review => review.productId === productId && review.status === ReviewStatus.APPROVED
    );
    const totalReviews = reviews.length;
    const averageRating = totalReviews
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
      : 0;
    const ratingBreakdown: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
    for (const review of reviews) {
      ratingBreakdown[String(review.rating)] = (ratingBreakdown[String(review.rating)] ?? 0) + 1;
    }

    return {
      productId,
      averageRating,
      totalReviews,
      ratingBreakdown,
    };
  },
});
