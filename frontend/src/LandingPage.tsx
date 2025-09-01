import React from 'react';
import { Button, Box, Typography, AppBar, Toolbar, Container, Card, CardContent, Avatar, Rating } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { 
  AutoAwesome, 
  Search, 
  LibraryAdd,
  PlayArrow
} from '@mui/icons-material';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #f8fafc 0%, #ede9fe 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Navigation Header */}
      <AppBar position="static" elevation={0} sx={{ 
        backgroundColor: 'transparent',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <Toolbar sx={{
          py: 1,
          px: 0,
          minHeight: '64px',
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
        }}>
          {/* Logo (left) */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 1 }}>
            <Typography variant="h6" sx={{ 
              fontWeight: 700, 
              color: '#1e293b',
              fontSize: '1.25rem'
            }}>
              Fink AI
            </Typography>
          </Box>

          {/* Centered navigation links */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
            <Typography sx={{ color: '#64748b', cursor: 'pointer', '&:hover': { color: '#1e293b' } }}>
              About Us
            </Typography>
            <Typography sx={{ color: '#64748b', cursor: 'pointer', '&:hover': { color: '#1e293b' } }}>
              Privacy
            </Typography>
            <Typography sx={{ color: '#64748b', cursor: 'pointer', '&:hover': { color: '#1e293b' } }}>
              Pricing
            </Typography>
            <Typography sx={{ color: '#64748b', cursor: 'pointer', '&:hover': { color: '#1e293b' } }}>
              Transcribe Audio
            </Typography>
          </Box>

          {/* CTA button (right) */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3}}>
            <Typography sx={{ color: '#64748b', cursor: 'pointer', '&:hover': { color: '#1e293b' } }}>
              Log In
            </Typography>
            <Button
              variant="contained"
              sx={{
                backgroundColor: '#7c3aed',
                color: 'white',
                borderRadius: 3,
                px: 3,
                py: 1,
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': { backgroundColor: '#6d28d9' }
              }}
            >
              Sign Up
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Large Circular Background */}
      <Box sx={{
        position: 'absolute',
        top: '10%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '900px',
        height: '900px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124, 58, 237, 0.12) 0%, rgba(124, 58, 237, 0.06) 40%, transparent 70%)',
        zIndex: 0
      }} />

      {/* Main Content */}
      <Box sx={{ 
        position: 'relative', 
        zIndex: 1, 
        marginBottom: 25,
        textAlign: 'center',
        pt: 8,
        px: 4
      }}>
        {/* Product Hunt Badge */}
        <Box sx={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: 1,
          backgroundColor: 'rgba(255,255,255,0.9)',
          border: '1px solid rgba(203, 213, 225, 0.5)',
          borderRadius: 4,
          px: 3,
          py: 1.5,
          mb: 6,
          backdropFilter: 'blur(10px)'
        }}>
          <Typography sx={{ color: '#64748b', fontSize: '0.9rem' }}>
            BACKED BY
          </Typography>
          <Typography sx={{ color: '#1e293b', fontWeight: 600, fontSize: '0.9rem' }}>
            N/A
          </Typography>
        </Box>

        {/* Hero Text */}
        <Typography variant="h1" sx={{ 
          fontSize: { xs: '2rem', md: '3rem' }, 
          fontWeight: 600,
          color: '#1e293b',
          lineHeight: 1.3,
          mb: 2,
          maxWidth: '800px',
          mx: 'auto'
        }}>
          Track your whole life with your{' '}
          <Box component="span" sx={{ 
            color: '#7c3aed',
            display: 'block',
            mt: 1
          }}>
            Second Brain
          </Box>
        </Typography>

        <Typography variant="h6" sx={{ 
          color: '#64748b', 
          fontSize: '1.25rem',
          fontWeight: 400,
          mb: 4,
          maxWidth: '600px',
          mx: 'auto',
          lineHeight: 1.5
        }}>
          Get perfect <strong>AI notes</strong>, <strong>to-dos</strong>, and <strong>answers before you ask</strong>
          <br />
          during meetings, lectures, and conversations.
        </Typography>

        {/* Watch Demo Button */}
        <Button
          variant="contained"
          onClick={() => navigate('/notes')}
          sx={{
            backgroundColor: '#7c3aed',
            color: 'white',
            borderRadius: 3,
            px: 5,
            py: 1,
            textTransform: 'none',
            fontSize: '1rem',
            fontWeight: 600,
            '&:hover': { backgroundColor: '#6d28d9' }
          }}
        >
          Start for free
        </Button>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 10 }}>
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography variant="h3" sx={{ 
            fontWeight: 600,
            color: '#1e293b',
            mb: 3
          }}>
            Your AI-Powered Memory Assistant
          </Typography>
          <Typography variant="h6" sx={{ 
            color: '#64748b',
            maxWidth: '600px',
            mx: 'auto'
          }}>
            Transform how you capture, organize, and retrieve information with intelligent features
          </Typography>
        </Box>

        <Box sx={{ 
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 4
        }}>
          <Card sx={{ 
            p: 3, 
            height: '100%',
            border: '1px solid #e2e8f0',
            borderRadius: 3,
            '&:hover': { 
              borderColor: '#7c3aed',
              transform: 'translateY(-4px)',
              transition: 'all 0.3s ease'
            }
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <AutoAwesome sx={{ fontSize: 48, color: '#7c3aed', mb: 2 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                AI-Powered Notes
              </Typography>
              <Typography sx={{ color: '#64748b' }}>
                Automatically generate structured notes from your conversations, meetings, and lectures with advanced AI technology.
              </Typography>
            </CardContent>
          </Card>

          <Card sx={{ 
            p: 3, 
            height: '100%',
            border: '1px solid #e2e8f0',
            borderRadius: 3,
            '&:hover': { 
              borderColor: '#7c3aed',
              transform: 'translateY(-4px)',
              transition: 'all 0.3s ease'
            }
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Search sx={{ fontSize: 48, color: '#7c3aed', mb: 2 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Intelligent Search & Retrieval
              </Typography>
              <Typography sx={{ color: '#64748b' }}>
                Find and retrieve information effortlessly with our advanced natural language search capabilities.
              </Typography>
            </CardContent>
          </Card>

          <Card sx={{ 
            p: 3, 
            height: '100%',
            border: '1px solid #e2e8f0',
            borderRadius: 3,
            '&:hover': { 
              borderColor: '#7c3aed',
              transform: 'translateY(-4px)',
              transition: 'all 0.3s ease'
            }
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <LibraryAdd sx={{ fontSize: 48, color: '#7c3aed', mb: 2 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Multi-modal Input
              </Typography>
              <Typography sx={{ color: '#64748b' }}>
                Capture information through text, voice, and images. Our AI understands and organizes all types of input seamlessly.
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Container>

      {/* How It Works Section */}
      <Box sx={{ 
        backgroundColor: '#f8fafc',
        py: 10
      }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography variant="h3" sx={{ 
              fontWeight: 600,
              color: '#1e293b',
              mb: 3
            }}>
              How Fink AI Works
            </Typography>
            <Typography variant="h6" sx={{ 
              color: '#64748b',
              maxWidth: '600px',
              mx: 'auto'
            }}>
              Simple steps to transform your information into actionable knowledge
            </Typography>
          </Box>

          <Box sx={{ 
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 6,
            alignItems: 'center'
          }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Box sx={{ display: 'flex', gap: 3 }}>
                <Box sx={{ 
                  backgroundColor: '#7c3aed',
                  color: 'white',
                  borderRadius: '50%',
                  width: 48,
                  height: 48,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: '1.25rem'
                }}>
                  1
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    Capture Information
                  </Typography>
                  <Typography sx={{ color: '#64748b' }}>
                    Record meetings, upload documents, or manually add notes. Our AI processes everything automatically.
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 3 }}>
                <Box sx={{ 
                  backgroundColor: '#7c3aed',
                  color: 'white',
                  borderRadius: '50%',
                  width: 48,
                  height: 48,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: '1.25rem'
                }}>
                  2
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    AI Processing
                  </Typography>
                  <Typography sx={{ color: '#64748b' }}>
                    Advanced AI analyzes, structures, and creates intelligent summaries and action items from your content.
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 3 }}>
                <Box sx={{ 
                  backgroundColor: '#7c3aed',
                  color: 'white',
                  borderRadius: '50%',
                  width: 48,
                  height: 48,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: '1.25rem'
                }}>
                  3
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    Instant Retrieval
                  </Typography>
                  <Typography sx={{ color: '#64748b' }}>
                    Ask questions and get instant answers. Search across all your notes with natural language queries.
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Box sx={{ 
              backgroundColor: 'white',
              borderRadius: 4,
              p: 4,
              border: '1px solid #e2e8f0',
              textAlign: 'center'
            }}>
              <PlayArrow sx={{ 
                fontSize: 80, 
                color: '#7c3aed',
                backgroundColor: 'rgba(124, 58, 237, 0.1)',
                borderRadius: '50%',
                p: 2,
                mb: 2
              }} />
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Watch Demo Video
              </Typography>
              <Typography sx={{ color: '#64748b', mb: 3 }}>
                See how Fink AI transforms your note-taking experience in just 2 minutes.
              </Typography>
              <Button
                variant="contained"
                sx={{
                  backgroundColor: '#7c3aed',
                  color: 'white',
                  borderRadius: 3,
                  px: 4,
                  py: 1.5,
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': { backgroundColor: '#6d28d9' }
                }}
              >
                Play Demo
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Testimonials Section */}
      <Container maxWidth="lg" sx={{ py: 10 }}>
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography variant="h3" sx={{ 
            fontWeight: 600,
            color: '#1e293b',
            mb: 3
          }}>
            Loved by Thousands
          </Typography>
          <Typography variant="h6" sx={{ 
            color: '#64748b',
            maxWidth: '600px',
            mx: 'auto'
          }}>
            Join professionals, students, and researchers who never forget important information
          </Typography>
        </Box>

        <Box sx={{ 
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 4
        }}>
          <Card sx={{ 
            p: 3,
            height: '100%',
            border: '1px solid #e2e8f0',
            borderRadius: 3
          }}>
            <CardContent>
              <Rating value={5} readOnly sx={{ mb: 2 }} />
              <Typography sx={{ mb: 3, fontStyle: 'italic', color: '#64748b' }}>
                "Fink AI has completely transformed how I take notes in meetings. I never miss important details anymore!"
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: '#7c3aed' }}>JS</Avatar>
                <Box>
                  <Typography sx={{ fontWeight: 600 }}>Jessica Smith</Typography>
                  <Typography sx={{ color: '#64748b', fontSize: '0.9rem' }}>Product Manager</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ 
            p: 3,
            height: '100%',
            border: '1px solid #e2e8f0',
            borderRadius: 3
          }}>
            <CardContent>
              <Rating value={5} readOnly sx={{ mb: 2 }} />
              <Typography sx={{ mb: 3, fontStyle: 'italic', color: '#64748b' }}>
                "The AI search feature is incredible. I can find any piece of information from months ago in seconds."
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: '#7c3aed' }}>MJ</Avatar>
                <Box>
                  <Typography sx={{ fontWeight: 600 }}>Michael Johnson</Typography>
                  <Typography sx={{ color: '#64748b', fontSize: '0.9rem' }}>Graduate Student</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ 
            p: 3,
            height: '100%',
            border: '1px solid #e2e8f0',
            borderRadius: 3
          }}>
            <CardContent>
              <Rating value={5} readOnly sx={{ mb: 2 }} />
              <Typography sx={{ mb: 3, fontStyle: 'italic', color: '#64748b' }}>
                "Perfect for research! The transcription accuracy and automatic organization saves me hours every week."
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: '#7c3aed' }}>AL</Avatar>
                <Box>
                  <Typography sx={{ fontWeight: 600 }}>Dr. Amanda Lee</Typography>
                  <Typography sx={{ color: '#64748b', fontSize: '0.9rem' }}>Research Scientist</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Container>

      {/* Final CTA Section */}
      <Box sx={{ 
        backgroundColor: '#1e293b',
        color: 'white',
        py: 10,
        textAlign: 'center'
      }}>
        <Container maxWidth="md">
          <Typography variant="h3" sx={{ 
            fontWeight: 600,
            mb: 3
          }}>
            Ready to Never Forget Again?
          </Typography>
          <Typography variant="h6" sx={{ 
            color: '#94a3b8',
            mb: 6
          }}>
            Join thousands of users who've revolutionized their note-taking with AI
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/notes')}
              sx={{
                backgroundColor: '#7c3aed',
                color: 'white',
                borderRadius: 3,
                px: 6,
                py: 2,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '1.1rem',
                '&:hover': { backgroundColor: '#6d28d9' }
              }}
            >
              Start Free Today
            </Button>
            <Button
              variant="outlined"
              size="large"
              sx={{
                borderColor: '#64748b',
                color: '#94a3b8',
                borderRadius: 3,
                px: 6,
                py: 2,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '1.1rem',
                '&:hover': { 
                  borderColor: '#94a3b8',
                  color: 'white'
                }
              }}
            >
              Schedule Demo
            </Button>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;