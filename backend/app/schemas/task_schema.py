from marshmallow import Schema, fields, validate

from ..models.task import VALID_STATUSES, VALID_PRIORITIES


class TaskCreateSchema(Schema):
    title = fields.Str(required=True, validate=validate.Length(min=1, max=200))
    description = fields.Str(load_default="", allow_none=True)
    assignee_id = fields.Int(allow_none=True, load_default=None)
    status = fields.Str(load_default="todo", validate=validate.OneOf(VALID_STATUSES))
    priority = fields.Str(load_default="medium", validate=validate.OneOf(VALID_PRIORITIES))
    due_date = fields.Date(allow_none=True, load_default=None)


class TaskUpdateSchema(Schema):
    title = fields.Str(validate=validate.Length(min=1, max=200))
    description = fields.Str(allow_none=True)
    assignee_id = fields.Int(allow_none=True)
    status = fields.Str(validate=validate.OneOf(VALID_STATUSES))
    priority = fields.Str(validate=validate.OneOf(VALID_PRIORITIES))
    due_date = fields.Date(allow_none=True)


task_create_schema = TaskCreateSchema()
task_update_schema = TaskUpdateSchema()
