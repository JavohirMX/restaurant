"""
Custom authentication backend for email-based authentication.

Allows users to authenticate using their email address instead of username.
"""

from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model

User = get_user_model()


class EmailBackend(ModelBackend):
    """
    Authentication backend that authenticates users using email address.
    
    This backend allows users to log in with their email and password,
    which is the expected behavior for the restaurant admin dashboard.
    """
    
    def authenticate(self, request, email=None, password=None, **kwargs):
        """
        Authenticate a user using email and password.
        
        Args:
            request: The HTTP request object
            email: User's email address
            password: User's password
            **kwargs: Additional keyword arguments
            
        Returns:
            User object if authentication succeeds, None otherwise
        """
        if email is None or password is None:
            return None
        
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            # Run the default password hasher to prevent timing attacks
            User().set_password(password)
            return None
        
        # Check password and if user can authenticate
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        
        return None
    
    def get_user(self, user_id):
        """
        Retrieve a user by their primary key.
        
        Args:
            user_id: The user's primary key
            
        Returns:
            User object if found, None otherwise
        """
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
