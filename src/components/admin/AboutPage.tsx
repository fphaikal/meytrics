import { Card, CardBody, Chip, Button, Link } from "@heroui/react";
import { Github, Heart, Info, Globe, Shield, Activity } from "lucide-react";

export function AboutPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="text-center py-10">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-primary/10 rounded-full">
            <Activity className="w-12 h-12 text-primary" />
          </div>
        </div>
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-linear-to-r from-primary to-secondary mb-2">
          MEYTRICS
        </h1>
        <p className="text-default-500 font-medium">Open Source Status Page & Monitoring System</p>
        <div className="mt-4">
          <Chip color="primary" variant="flat">v{__APP_VERSION__}</Chip>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="h-full">
          <CardBody className="p-6 gap-4">
            <div className="flex items-center gap-3 mb-2">
              <Info className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-bold">Project Information</h2>
            </div>
            <p className="text-default-500">
              MEYTRICS is a comprehensive monitoring solution designed to provide real-time insights into your services' health and performance.
            </p>
            <div className="space-y-2 mt-2">
              <div className="flex justify-between py-2 border-b border-divider">
                <span className="text-default-500">Version</span>
                <span className="font-medium">{__APP_VERSION__}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-divider">
                <span className="text-default-500">License</span>
                <span className="font-medium">MIT</span>
              </div>
              <div className="flex justify-between py-2 border-b border-divider">
                <span className="text-default-500">Developer</span>
                <span className="font-medium">fphaikal</span>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="h-full">
          <CardBody className="p-6 gap-4">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-6 h-6 text-success" />
              <h2 className="text-xl font-bold">Tech Stack</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Chip variant="flat">React</Chip>
              <Chip variant="flat">Node.js</Chip>
              <Chip variant="flat">Express</Chip>
              <Chip variant="flat">SQLite</Chip>
              <Chip variant="flat">Vite</Chip>
              <Chip variant="flat">TailwindCSS</Chip>
              <Chip variant="flat">HeroUI</Chip>
              <Chip variant="flat">Recharts</Chip>
            </div>
            <p className="text-default-500 mt-2">
              Built with modern web technologies for performance and reliability.
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody className="p-6 items-center text-center gap-4">
          <div className="p-3 bg-danger/10 rounded-full">
            <Heart className="w-6 h-6 text-danger" />
          </div>
          <h3 className="text-lg font-semibold">Support the Project</h3>
          <p className="text-default-500 max-w-lg">
            If you find MEYTRICS useful, consider starring the repository or contributing to its development.
          </p>
          <div className="flex gap-4">
            <Button
              as={Link}
              href="https://github.com/fphaikal/meytrics"
              target="_blank"
              variant="flat"
              color="default"
              startContent={<Github className="w-4 h-4" />}
            >
              Star on GitHub
            </Button>
            <Button
              as={Link}
              href="https://fph.my.id" // Placeholder or actual site if known
              target="_blank"
              color="primary"
              startContent={<Globe className="w-4 h-4" />}
            >
              Visit Website
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
