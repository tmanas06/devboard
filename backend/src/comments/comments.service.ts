import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CommentResponseDto } from './dto/comment-response.dto';

@Injectable()
export class CommentsService {
    constructor(
        private prisma: PrismaService,
        private activityService: ActivityService,
    ) { }

    async getCommentsByTask(taskId: string): Promise<CommentResponseDto[]> {
        const task = await this.prisma.task.findUnique({
            where: { id: taskId },
        });

        if (!task) {
            throw new NotFoundException(`Task with ID ${taskId} not found`);
        }

        const comments = await this.prisma.comment.findMany({
            where: { taskId },
            orderBy: { createdAt: 'asc' },
            include: {
                user: true,
            },
        });

        return comments.map(CommentResponseDto.from);
    }

    async createComment(taskId: string, userId: string, dto: CreateCommentDto): Promise<CommentResponseDto> {
        const task = await this.prisma.task.findUnique({
            where: { id: taskId },
        });

        if (!task) {
            throw new NotFoundException(`Task with ID ${taskId} not found`);
        }

        const comment = await this.prisma.comment.create({
            data: {
                body: dto.body,
                taskId,
                userId,
            },
            include: {
                user: true,
            },
        });

        await this.activityService.log({
            organizationId: task.organizationId,
            userId,
            action: 'COMMENT_ADDED',
            entityType: 'COMMENT',
            entityId: comment.id,
            metadata: { taskId, taskTitle: task.title, bodyPreview: dto.body.substring(0, 100) },
        });

        return CommentResponseDto.from(comment);
    }

    async deleteComment(commentId: string, userId: string): Promise<void> {
        const comment = await this.prisma.comment.findUnique({
            where: { id: commentId },
            include: { task: true },
        });

        if (!comment) {
            throw new NotFoundException(`Comment with ID ${commentId} not found`);
        }

        if (comment.userId !== userId) {
            throw new ForbiddenException('You are not authorized to delete this comment');
        }

        await this.prisma.comment.delete({
            where: { id: commentId },
        });

        await this.activityService.log({
            organizationId: comment.task.organizationId,
            userId,
            action: 'COMMENT_DELETED',
            entityType: 'COMMENT',
            entityId: commentId,
            metadata: { taskId: comment.taskId, taskTitle: comment.task.title },
        });
    }
}
