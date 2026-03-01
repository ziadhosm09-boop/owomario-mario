import { ArrowRight, LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";

interface ServiceCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  image: string;
  link: string;
}

export const ServiceCard = ({ icon: Icon, title, description, image, link }: ServiceCardProps) => {
  return (
    <div className="group relative overflow-hidden rounded-2xl glass hover:border-primary/30 transition-all duration-500 hover:shadow-glow hover:-translate-y-1">
      <div className="aspect-video overflow-hidden relative">
        <img 
          src={image} 
          alt={title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
      </div>
      
      <div className="p-6 space-y-4 relative">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 backdrop-blur-sm border border-white/10">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-xl font-bold">{title}</h3>
        </div>
        
        <p className="text-muted-foreground text-sm leading-relaxed">
          {description}
        </p>
        
        <Link to={link}>
          <Button className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-all group/btn">
            Get Started
            <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </div>
    </div>
  );
};
