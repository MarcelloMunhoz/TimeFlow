import { Button } from "@/components/ui/button";
import { AlertCircle, Home, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import {
  Container,
  PageTitle,
  BodyText,
  EnhancedCard,
  Animated
} from "@/components/ui/design-system";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50/30">
      <Container size="sm">
        <Animated animation="scale">
          <EnhancedCard variant="elevated" className="text-center" padding="lg">
            <div className="space-y-6">
              {/* Error Icon */}
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-10 w-10 text-red-500" />
                </div>
              </div>

              {/* Error Message */}
              <div className="space-y-3">
                <PageTitle className="text-red-600">404</PageTitle>
                <h2 className="text-xl font-semibold text-foreground">Página não encontrada</h2>
                <BodyText>
                  A página que você está procurando não existe ou foi movida para outro local.
                </BodyText>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/">
                  <Button className="w-full sm:w-auto">
                    <Home className="w-4 h-4 mr-2" />
                    Ir para o Dashboard
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => window.history.back()}
                  className="w-full sm:w-auto"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              </div>

              {/* Help Text */}
              <div className="pt-4 border-t border-border/50">
                <p className="text-sm text-muted-foreground">
                  Se você acredita que isso é um erro, entre em contato com o suporte.
                </p>
              </div>
            </div>
          </EnhancedCard>
        </Animated>
      </Container>
    </div>
  );
}
