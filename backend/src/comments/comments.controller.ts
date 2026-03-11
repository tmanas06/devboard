import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CommentResponseDto } from './dto/comment-response.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, type CurrentUserData } from '../auth/decorators/current-user.decorator';

@Controller()
export class CommentsController {
    constructor(private readonly commentsService: CommentsService) { }

    @Get('tasks/:taskId/comments')
    getCommentsByTask(@Param('taskId') taskId: string): Promise<CommentResponseDto[]> {
        return this.commentsService.getCommentsByTask(taskId);
    }

    @UseGuards(AuthGuard)
    @Post('tasks/:taskId/comments')
    createComment(
        @Param('taskId') taskId: string,
        @CurrentUser() user: CurrentUserData,
        @Body() dto: CreateCommentDto,
    ): Promise<CommentResponseDto> {
        return this.commentsService.createComment(taskId, user.id, dto);
    }

    @UseGuards(AuthGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    @Delete('comments/:id')
    deleteComment(
        @Param('id') id: string,
        @CurrentUser() user: CurrentUserData,
    ): Promise<void> {
        return this.commentsService.deleteComment(id, user.id);
    }
}
