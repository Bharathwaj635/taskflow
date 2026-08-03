from marshmallow import Schema, fields, validate


class RegisterSchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=1, max=120))
    username = fields.Str(
        required=True,
        validate=validate.Regexp(
            r"^[a-zA-Z0-9_.]{3,50}$",
            error="Username must be 3-50 characters (letters, numbers, '_' or '.' only)",
        ),
    )
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=validate.Length(min=6, max=255))


class LoginSchema(Schema):
    # Accepts EITHER a username OR an email address in the same field,
    # matching the "Username or Email" field in the UI.
    identifier = fields.Str(required=True, validate=validate.Length(min=1, max=120))
    password = fields.Str(required=True)


class ProfileUpdateSchema(Schema):
    name = fields.Str(validate=validate.Length(min=1, max=120))


class PasswordChangeSchema(Schema):
    current_password = fields.Str(required=True)
    new_password = fields.Str(required=True, validate=validate.Length(min=6, max=255))


class UserSchema(Schema):
    id = fields.Int(dump_only=True)
    name = fields.Str(dump_only=True)
    username = fields.Str(dump_only=True)
    email = fields.Email(dump_only=True)
    created_at = fields.DateTime(dump_only=True)


register_schema = RegisterSchema()
login_schema = LoginSchema()
user_schema = UserSchema()
profile_update_schema = ProfileUpdateSchema()
password_change_schema = PasswordChangeSchema()
