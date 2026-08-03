from marshmallow import Schema, fields, validate

from ..models.project import VALID_STATUSES


class ProjectCreateSchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=1, max=150))
    description = fields.Str(load_default="", allow_none=True)
    status = fields.Str(load_default="active", validate=validate.OneOf(VALID_STATUSES))
    start_date = fields.Date(allow_none=True, load_default=None)
    end_date = fields.Date(allow_none=True, load_default=None)


class ProjectUpdateSchema(Schema):
    name = fields.Str(validate=validate.Length(min=1, max=150))
    description = fields.Str(allow_none=True)
    status = fields.Str(validate=validate.OneOf(VALID_STATUSES))
    start_date = fields.Date(allow_none=True)
    end_date = fields.Date(allow_none=True)


class ProjectMemberAddSchema(Schema):
    email = fields.Email(required=True)
    role = fields.Str(load_default="member", validate=validate.OneOf(["owner", "member"]))


project_create_schema = ProjectCreateSchema()
project_update_schema = ProjectUpdateSchema()
project_member_add_schema = ProjectMemberAddSchema()
