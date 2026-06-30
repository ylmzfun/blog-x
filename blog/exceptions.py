from rest_framework.views import exception_handler
from rest_framework.response import Response


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        data = response.data
        code = response.status_code
        message = 'error'

        if isinstance(data, dict):
            if 'detail' in data:
                message = str(data['detail'])
            elif 'non_field_errors' in data:
                message = str(data['non_field_errors'][0])
            else:
                errors = []
                for field, msgs in data.items():
                    if isinstance(msgs, list):
                        errors.append(f'{field}: {msgs[0]}')
                    else:
                        errors.append(f'{field}: {msgs}')
                message = '; '.join(errors) if errors else 'Validation error'

        response.data = {
            'code': code,
            'message': message,
        }
        return response

    # Non-DRF exception — return JSON response
    return Response(
        {'code': 500, 'message': 'Server error'},
        status=500,
    )
