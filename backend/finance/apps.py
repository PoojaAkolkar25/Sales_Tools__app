from django.apps import AppConfig  # type: ignore


class FinanceConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "finance"

    def ready(self):
        import finance.signals  # type: ignore
