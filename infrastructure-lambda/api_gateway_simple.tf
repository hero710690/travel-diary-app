# Simplified API Gateway Method Settings - No logging
resource "aws_api_gateway_method_settings" "main_simple" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.main.stage_name
  method_path = "*/*"

  settings {
    # Only enable metrics, no logging
    metrics_enabled = true
    # Remove logging_level to avoid CloudWatch role requirement
  }
}
