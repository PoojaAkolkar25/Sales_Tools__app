from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth.models import User
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from deals.models import AuditTrail
from .serializers import UserSerializer
import logging

logger = logging.getLogger(__name__)

token_generator = PasswordResetTokenGenerator()


class LoginView(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        try:
            serializer = self.serializer_class(data=request.data,
                                               context={'request': request})
            serializer.is_valid(raise_exception=True)
            user = serializer.validated_data['user']
            token, created = Token.objects.get_or_create(user=user)
            
            user_serializer = UserSerializer(user)
            return Response({
                'token': token.key,
                'user': user_serializer.data
            })
        except Exception as e:
            logger.error(f"Login error for user {request.data.get('username')}: {str(e)}", exc_info=True)
            return Response({"error": "Invalid credentials or account issue"}, status=status.HTTP_400_BAD_REQUEST)


class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        identifier = request.data.get('email', '').strip()
        if not identifier:
            return Response({"error": "Email or username is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Try to find user by email first, then by username
        user = None
        if '@' in identifier:
            # Looks like an email
            users = User.objects.filter(email__iexact=identifier)
            if users.count() > 1:
                logger.warning(f"Forgot-password: found {users.count()} users with email '{identifier}'. Picking first.")
            user = users.first()

            if user is None:
                # Maybe they typed their email as username
                user = User.objects.filter(username__iexact=identifier).first()
        else:
            # Treat as username
            user = User.objects.filter(username__iexact=identifier).first()

        if user is None:
            logger.info(f"Forgot-password: no user found for identifier '{identifier}'")
            # Return generic success to avoid user enumeration
            return Response({"message": "If this account exists, a reset link has been sent."})

        # Determine send-to address
        send_to = user.email
        if not send_to:
            logger.warning(
                f"Forgot-password: user '{user.username}' has no email address set. "
                "Please set an email in Django admin for this user."
            )
            # Still return generic success to avoid enumeration
            return Response({"message": "If this account exists, a reset link has been sent."})

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = token_generator.make_token(user)
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173/').rstrip('/')
        reset_url = f"{frontend_url}/reset-password?uid={uid}&token={token}"

        logger.info(f"Forgot-password: sending reset email to {send_to} for user '{user.username}'")

        try:
            send_mail(
                subject="Reset Your Password – AutomationEdge",
                message=(
                    f"Hi {user.get_full_name() or user.username},\n\n"
                    f"You requested a password reset. Click the link below to set a new password:\n\n"
                    f"{reset_url}\n\n"
                    "This link is valid for 24 hours. If you did not request this, ignore this email.\n\n"
                    "– AutomationEdge Team"
                ),
                html_message=f"""
                <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;
                            border:1px solid #e5e7eb;border-radius:12px;background:#fff;">
                    <div style="text-align:center;margin-bottom:24px;">
                        <span style="font-size:28px;font-weight:700;color:#4f46e5;">Automation</span>
                        <span style="font-size:28px;font-weight:400;color:#555;">Edge</span>
                    </div>
                    <h2 style="color:#1f2937;margin-bottom:8px;">Reset Your Password</h2>
                    <p style="color:#4b5563;">Hi <strong>{user.get_full_name() or user.username}</strong>,</p>
                    <p style="color:#4b5563;">
                        We received a request to reset your password.
                        Click the button below to choose a new one.
                    </p>
                    <div style="text-align:center;margin:32px 0;">
                        <a href="{reset_url}"
                           style="background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;
                                  padding:14px 32px;border-radius:8px;text-decoration:none;
                                  font-weight:600;font-size:15px;">
                            Set New Password
                        </a>
                    </div>
                    <p style="color:#6b7280;font-size:13px;">
                        This link expires in <strong>24 hours</strong>.
                        If you did not request a reset, you can safely ignore this email.
                    </p>
                    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
                    <p style="color:#9ca3af;font-size:12px;text-align:center;">
                        &copy; 2025 AutomationEdge. All rights reserved.
                    </p>
                </div>
                """,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[send_to],
                fail_silently=False,
            )
            logger.info(f"Password reset email sent successfully to {send_to}")
        except Exception as e:
            logger.error(
                f"SMTP ERROR – Failed to send password reset email to {send_to}: "
                f"{type(e).__name__}: {str(e)}",
                exc_info=True
            )
            return Response(
                {"error": "Failed to send reset email. Please contact the administrator."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response({"message": "If this account exists, a reset link has been sent."})



class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        uid = request.data.get('uid', '')
        token = request.data.get('token', '')
        new_password = request.data.get('new_password', '')

        if not uid or not token or not new_password:
            return Response({"error": "uid, token, and new_password are required."}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 8:
            return Response({"error": "Password must be at least 8 characters."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({"error": "Invalid reset link."}, status=status.HTTP_400_BAD_REQUEST)

        if not token_generator.check_token(user, token):
            return Response({"error": "This reset link is invalid or has expired."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        # Invalidate all auth tokens so existing sessions are logged out
        Token.objects.filter(user=user).delete()
        logger.info(f"Password successfully reset for user {user.username}")
        return Response({"message": "Password has been reset successfully."})


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer

    def get_permissions(self):
        if self.action in ['create', 'destroy', 'toggle_status']:
            # Only admin can create, delete, or toggle status
            return [permissions.IsAuthenticated(), IsAppAdmin()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        try:
            user = serializer.save()
            
            # Log audit trail for user creation
            content_type = ContentType.objects.get_for_model(User)
            AuditTrail.objects.create(
                content_type=content_type,
                object_id=user.id,
                user=self.request.user,
                action_type='CREATE',
                field_name='created',
                old_value='',
                new_value=f'User {user.username} created'
            )
        except Exception as e:
            logger.error(f"Error creating user: {str(e)}", exc_info=True)
            raise

    def perform_update(self, serializer):
        try:
            user = serializer.save()
            
            # Log audit trail for user update
            content_type = ContentType.objects.get_for_model(User)
            AuditTrail.objects.create(
                content_type=content_type,
                object_id=user.id,
                user=self.request.user,
                action_type='UPDATE',
                field_name='username',
                old_value=user.username,
                new_value=f'User profile for {user.username} updated'
            )
        except Exception as e:
            logger.error(f"Error updating user: {str(e)}", exc_info=True)
            raise

    @action(detail=True, methods=['post'])
    def toggle_status(self, request, pk=None):
        try:
            user = self.get_object()
            old_status = user.is_active
            user.is_active = not user.is_active
            user.save()
            
            # Log audit trail for status toggle
            content_type = ContentType.objects.get_for_model(User)
            AuditTrail.objects.create(
                content_type=content_type,
                object_id=user.id,
                user=request.user,
                action_type='UPDATE',
                field_name='is_active',
                old_value=str(old_status),
                new_value=str(user.is_active)
            )
            
            return Response({
                'status': 'success',
                'is_active': user.is_active,
                'message': f'User {user.username} is now {"active" if user.is_active else "inactive"}'
            })
        except Exception as e:
            logger.error(f"Error toggling status for user: {str(e)}", exc_info=True)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class IsAppAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_superuser or request.user.groups.filter(name='app_admin').exists()

class CurrentUserView(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
