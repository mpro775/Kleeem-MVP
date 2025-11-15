import {
  Box,
  Typography,
  Container,
  Link,
  IconButton,
  Divider,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Facebook,
  Twitter,
  Instagram,
  LinkedIn,
  YouTube,
  Phone,
  LocationOn,
  AccessTime,
} from "@mui/icons-material";
import type { MerchantInfo } from "@/features/mechant/merchant-settings/types";
import type { Category } from "@/features/mechant/categories/type";
import { Link as RouterLink, useParams } from "react-router-dom";

const socialIcons = {
  facebook: Facebook,
  twitter: Twitter,
  instagram: Instagram,
  linkedin: LinkedIn,
  youtube: YouTube,
};

export function Footer({
  merchant,
  categories,
}: {
  merchant: MerchantInfo;
  categories: Category[];
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { slugOrId } = useParams<{ slugOrId: string }>();
  const base = `/store/${slugOrId || merchant.publicSlug || merchant._id}`;

  const workingHoursStr =
    merchant.workingHours?.length > 0
      ? merchant.workingHours
          .map((h) => `${h.day}: ${h.openTime} - ${h.closeTime}`)
          .join(" | ")
      : "";

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: "var(--brand)",
        color: "var(--on-brand)",
        py: { xs: 4, md: 6 },
        mt: "auto",
        position: "relative",
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "4px",
          background: "linear-gradient(90deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0.3) 100%)",
        }
      }}
    >
      <Container maxWidth="xl">
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: { xs: 5, md: 0 },
            justifyContent: "space-between",
            alignItems: { xs: "center", md: "flex-start" },
            textAlign: { xs: "center", md: "left" },
          }}
        >
          {/* Store Info */}
          <Box 
            flex={2} 
            mb={{ xs: 4, md: 0 }}
            sx={{
              width: { xs: "100%", md: "auto" },
              maxWidth: { xs: "400px", md: "none" }
            }}
          >
            <Box 
              mb={3} 
              display="flex" 
              alignItems="center"
              justifyContent={{ xs: "center", md: "flex-start" }}
              flexDirection={{ xs: "column", sm: "row" }}
              gap={{ xs: 2, sm: 1 }}
            >
              {merchant.logoUrl && (
                <Box
                  sx={{
                    position: "relative",
                    "&::after": {
                      content: '""',
                      position: "absolute",
                      top: -2,
                      left: -2,
                      right: -2,
                      bottom: -2,
                      background: "linear-gradient(45deg, rgba(255,255,255,0.3), rgba(255,255,255,0.1))",
                      borderRadius: "50%",
                      zIndex: 0,
                    }
                  }}
                >
                  <img
                    src={merchant.logoUrl}
                    alt={merchant.name}
                    width={isMobile ? 50 : 40}
                    height={isMobile ? 50 : 40}
                    style={{
                      borderRadius: "50%",
                      border: "3px solid rgba(255,255,255,0.9)",
                      position: "relative",
                      zIndex: 1,
                    }}
                  />
                </Box>
              )}
              <Typography 
                variant={isMobile ? "h5" : "h4"} 
                sx={{ 
                  color: "var(--on-brand)",
                  fontWeight: "bold",
                  textAlign: { xs: "center", sm: "left" },
                  mt: { xs: 1, sm: 0 }
                }}
              >
                {merchant.name}
              </Typography>
            </Box>
            <Typography 
              variant="body1" 
              sx={{ 
                mb: 3, 
                opacity: 0.9,
                lineHeight: 1.6,
                maxWidth: { xs: "100%", md: "300px" }
              }}
            >
              {merchant.businessDescription || "متجر إلكتروني متخصص في تقديم أفضل المنتجات والخدمات لعملائنا الكرام"}
            </Typography>

            {/* Social links */}
            <Box 
              sx={{ 
                display: "flex", 
                gap: 2, 
                mt: 3,
                justifyContent: { xs: "center", md: "flex-start" },
                flexWrap: "wrap"
              }}
            >
              {merchant.socialLinks &&
                Object.entries(merchant.socialLinks).map(([platform, url]) =>
                  url ? (
                    <IconButton
                      key={platform}
                      component="a"
                      href={url}
                      target="_blank"
                      rel="noopener"
                      size={isMobile ? "large" : "medium"}
                      sx={{
                        backgroundColor: "rgba(255,255,255,0.15)",
                        color: "var(--on-brand)",
                        border: "1px solid rgba(255,255,255,0.2)",
                        transition: "all 0.3s ease",
                        "&:hover": { 
                          backgroundColor: "rgba(255,255,255,0.25)",
                          transform: "translateY(-2px)",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                        },
                        "&:active": {
                          transform: "translateY(0)"
                        }
                      }}
                    >
                      {(() => {
                        const Icon =
                          socialIcons[platform as keyof typeof socialIcons];
                        return Icon ? <Icon sx={{ fontSize: isMobile ? "1.5rem" : "1.25rem" }} /> : null;
                      })()}
                    </IconButton>
                  ) : null
                )}
            </Box>
          </Box>

          {/* Quick Links */}
          <Box 
            flex={1} 
            mb={{ xs: 4, md: 0 }}
            sx={{
              width: { xs: "100%", md: "auto" },
              textAlign: { xs: "center", md: "left" }
            }}
          >
            <Typography
              variant={isMobile ? "h6" : "h6"}
              sx={{ 
                fontWeight: "bold", 
                mb: 3, 
                position: "relative",
                textAlign: { xs: "center", md: "left" }
              }}
            >
              روابط سريعة
              <Divider
                sx={{
                  width: isMobile ? "80px" : "50px",
                  height: "3px",
                  backgroundColor: "rgba(255,255,255,0.6)",
                  mt: 1,
                  mx: { xs: "auto", md: 0 },
                  borderRadius: "2px"
                }}
              />
            </Typography>
            <Box sx={{ 
              display: "flex", 
              flexDirection: "column", 
              gap: 2,
              alignItems: { xs: "center", md: "flex-start" }
            }}>
              <Link
                component={RouterLink}
                to={base}
                color="inherit"
                sx={{
                  textDecoration: "none",
                  opacity: 0.9,
                  transition: "all 0.3s ease",
                  "&:hover": { 
                    opacity: 1,
                    transform: "translateX(-5px)",
                    color: "rgba(255,255,255,1)"
                  },
                  fontSize: { xs: "1rem", md: "0.875rem" }
                }}
              >
                الصفحة الرئيسية
              </Link>
              <Link
                component={RouterLink}
                to={`${base}`}
                color="inherit"
                sx={{
                  textDecoration: "none",
                  opacity: 0.9,
                  transition: "all 0.3s ease",
                  "&:hover": { 
                    opacity: 1,
                    transform: "translateX(-5px)",
                    color: "rgba(255,255,255,1)"
                  },
                  fontSize: { xs: "1rem", md: "0.875rem" }
                }}
              >
                المتجر
              </Link>
              <Link
                component={RouterLink}
                to={`${base}/about`}
                color="inherit"
                sx={{
                  textDecoration: "none",
                  opacity: 0.9,
                  transition: "all 0.3s ease",
                  "&:hover": { 
                    opacity: 1,
                    transform: "translateX(-5px)",
                    color: "rgba(255,255,255,1)"
                  },
                  fontSize: { xs: "1rem", md: "0.875rem" }
                }}
              >
                من نحن
              </Link>
            </Box>
          </Box>

          {/* Categories */}
          <Box 
            flex={1} 
            mb={{ xs: 4, md: 0 }}
            sx={{
              width: { xs: "100%", md: "auto" },
              textAlign: { xs: "center", md: "left" }
            }}
          >
            <Typography
              variant={isMobile ? "h6" : "h6"}
              sx={{ 
                fontWeight: "bold", 
                mb: 3, 
                position: "relative",
                textAlign: { xs: "center", md: "left" }
              }}
            >
              التصنيفات
              <Divider
                sx={{
                  width: isMobile ? "80px" : "50px",
                  height: "3px",
                  backgroundColor: "rgba(255,255,255,0.6)",
                  mt: 1,
                  mx: { xs: "auto", md: 0 },
                  borderRadius: "2px"
                }}
              />
            </Typography>
            <Box sx={{ 
              display: "flex", 
              flexDirection: "column", 
              gap: 2,
              alignItems: { xs: "center", md: "flex-start" }
            }}>
              {categories.slice(0, 5).map((cat) => (
                <Link
                  key={cat._id}
                  component={RouterLink}
                  to={`${base}?cat=${cat._id}`}
                  color="inherit"
                  sx={{
                    textDecoration: "none",
                    opacity: 0.9,
                    transition: "all 0.3s ease",
                    "&:hover": { 
                      opacity: 1,
                      transform: "translateX(-5px)",
                      color: "rgba(255,255,255,1)"
                    },
                    fontSize: { xs: "1rem", md: "0.875rem" }
                  }}
                >
                  {cat.name}
                </Link>
              ))}
            </Box>
          </Box>

          {/* Contact Info */}
          <Box 
            flex={2}
            sx={{
              width: { xs: "100%", md: "auto" },
              textAlign: { xs: "center", md: "left" }
            }}
          >
            <Typography
              variant={isMobile ? "h6" : "h6"}
              sx={{ 
                fontWeight: "bold", 
                mb: 3, 
                position: "relative",
                textAlign: { xs: "center", md: "left" }
              }}
            >
              معلومات التواصل
              <Divider
                sx={{
                  width: isMobile ? "80px" : "50px",
                  height: "3px",
                  backgroundColor: "rgba(255,255,255,0.6)",
                  mt: 1,
                  mx: { xs: "auto", md: 0 },
                  borderRadius: "2px"
                }}
              />
            </Typography>
            <Box sx={{ 
              display: "flex", 
              flexDirection: "column", 
              gap: 3,
              alignItems: { xs: "center", md: "flex-start" }
            }}>
              {merchant.addresses?.[0] && (
                <Box sx={{ 
                  display: "flex", 
                  alignItems: "center",
                  flexDirection: { xs: "column", sm: "row" },
                  textAlign: { xs: "center", sm: "left" },
                  gap: { xs: 1, sm: 2 }
                }}>
                  <Box
                    sx={{
                      backgroundColor: "rgba(255,255,255,0.15)",
                      borderRadius: "50%",
                      p: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid rgba(255,255,255,0.2)"
                    }}
                  >
                    <LocationOn
                      sx={{
                        color: "var(--on-brand)",
                        opacity: 0.9,
                        fontSize: isMobile ? "2rem" : "1.8rem",
                      }}
                    />
                  </Box>
                  <Typography 
                    variant="body1"
                    sx={{
                      maxWidth: { xs: "250px", md: "none" },
                      lineHeight: 1.5
                    }}
                  >
                    {merchant.addresses[0].street}, {merchant.addresses[0].city}
                    , {merchant.addresses[0].country}
                  </Typography>
                </Box>
              )}
              {merchant.phone && (
                <Box sx={{ 
                  display: "flex", 
                  alignItems: "center",
                  flexDirection: { xs: "column", sm: "row" },
                  textAlign: { xs: "center", sm: "left" },
                  gap: { xs: 1, sm: 2 }
                }}>
                  <Box
                    sx={{
                      backgroundColor: "rgba(255,255,255,0.15)",
                      borderRadius: "50%",
                      p: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid rgba(255,255,255,0.2)"
                    }}
                  >
                    <Phone
                      sx={{
                        color: "var(--on-brand)",
                        opacity: 0.9,
                        fontSize: isMobile ? "2rem" : "1.8rem",
                      }}
                    />
                  </Box>
                  <Typography 
                    variant="body1"
                    sx={{
                      fontSize: { xs: "1.1rem", md: "1rem" },
                      fontWeight: "500"
                    }}
                  >
                    {merchant.phone}
                  </Typography>
                </Box>
              )}
              {workingHoursStr && (
                <Box sx={{ 
                  display: "flex", 
                  alignItems: "center",
                  flexDirection: { xs: "column", sm: "row" },
                  textAlign: { xs: "center", sm: "left" },
                  gap: { xs: 1, sm: 2 }
                }}>
                  <Box
                    sx={{
                      backgroundColor: "rgba(255,255,255,0.15)",
                      borderRadius: "50%",
                      p: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid rgba(255,255,255,0.2)"
                    }}
                  >
                    <AccessTime
                      sx={{
                        color: "var(--on-brand)",
                        opacity: 0.9,
                        fontSize: isMobile ? "2rem" : "1.8rem",
                      }}
                    />
                  </Box>
                  <Typography 
                    variant="body1"
                    sx={{
                      maxWidth: { xs: "280px", md: "none" },
                      lineHeight: 1.5
                    }}
                  >
                    {workingHoursStr}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Box>

        <Divider 
          sx={{ 
            my: { xs: 4, md: 5 }, 
            backgroundColor: "rgba(255,255,255,0.25)",
            height: "1px"
          }} 
        />

        {/* Bottom Row */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: "center",
            justifyContent: "space-between",
            textAlign: "center",
            gap: 3,
          }}
        >
          <Typography 
            variant="body2" 
            sx={{ 
              opacity: 0.8,
              fontSize: { xs: "0.9rem", md: "0.875rem" },
              lineHeight: 1.5
            }}
          >
            © {new Date().getFullYear()} {merchant.name}. جميع الحقوق محفوظة.
          </Typography>
          
          {/* Additional Footer Links */}
          <Box sx={{ 
            display: "flex", 
            gap: { xs: 2, md: 3 },
            flexWrap: "wrap",
            justifyContent: "center"
          }}>
            <Link
              component={RouterLink}
              to={`${base}/privacy`}
              color="inherit"
              sx={{
                textDecoration: "none",
                opacity: 0.7,
                fontSize: { xs: "0.8rem", md: "0.875rem" },
                transition: "opacity 0.3s ease",
                "&:hover": { opacity: 1 }
              }}
            >
              سياسة الخصوصية
            </Link>
            <Link
              component={RouterLink}
              to={`${base}/terms`}
              color="inherit"
              sx={{
                textDecoration: "none",
                opacity: 0.7,
                fontSize: { xs: "0.8rem", md: "0.875rem" },
                transition: "opacity 0.3s ease",
                "&:hover": { opacity: 1 }
              }}
            >
              شروط الاستخدام
            </Link>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
