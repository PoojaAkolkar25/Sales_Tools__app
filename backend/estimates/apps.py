from django.apps import AppConfig

class EstimatesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'estimates'

    def ready(self):
        import estimates.signals
