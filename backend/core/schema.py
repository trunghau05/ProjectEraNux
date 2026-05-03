from drf_spectacular.openapi import AutoSchema


class AppTagAutoSchema(AutoSchema):
    def get_tags(self):
        tags = super().get_tags()
        if tags and tags != ['api']:
            return tags

        tokenized_path = [segment for segment in self.path.strip('/').split('/') if segment]
        if len(tokenized_path) >= 2 and tokenized_path[0] == 'api':
            return [tokenized_path[1]]

        if tokenized_path:
            return [tokenized_path[0]]

        return tags

    def get_operation_id(self):
        operation_id = super().get_operation_id()
        if operation_id.startswith('api_'):
            return operation_id[4:]
        return operation_id