#include <stdio.h>
#include <memory.h>

#define OBJECT "Side_Table"

static void startObjectDeclaration(FILE* fp, const char* type)
{
    if(fp) {fprintf(fp, "\tvar %s=[", type);}
}
static void endObjectDeclaration(FILE* fp)
{
    if(fp) {fprintf(fp, "];");}
}
static void combine(FILE* fpv, FILE* fpi, FILE* fpn, FILE* fpt, FILE* fpjs){

    char buffer[4096]={0};
    fseek(fpv, 0, SEEK_SET);
    fseek(fpi, 0, SEEK_SET);
    fseek(fpn, 0, SEEK_SET);
    fseek(fpt, 0, SEEK_SET);

    fprintf(fpjs, "function object3d(){\n");

    fprintf(fpjs, "\n");
    while(fgets(buffer, sizeof(buffer), fpv)) {
        fwrite(buffer, strlen(buffer), 1, fpjs);
    }

    fprintf(fpjs, "\n");
    while(fgets(buffer, sizeof(buffer), fpi)) {
        fwrite(buffer, strlen(buffer), 1, fpjs);
    }

    fprintf(fpjs, "\n");
    while(fgets(buffer, sizeof(buffer), fpn)) {
        fwrite(buffer, strlen(buffer), 1, fpjs);
    }

    fprintf(fpjs, "\n");
    while(fgets(buffer, sizeof(buffer), fpt)) {
        fwrite(buffer, strlen(buffer), 1, fpjs);
    }

    fprintf(fpjs, "\n");
    fprintf(fpjs, "\tvar colors=[];\n");

    fprintf(fpjs, "\n");
    fprintf(fpjs, "\tvar obj={\n"
            "\t\tvertices:vertices,\n"
            "\t\tindices:indices,\n"
            "\t\tnormals:normals,\n"
            "\t\ttexture:texture,\n"
            "\t\tcolors:colors,\n"
                  "\t};\n"
            "\treturn obj;\n"
            "}\n"
            );
}
int main(int argc, char *argv[])
{
    constexpr char vertices_file[] = "/tmp/"OBJECT".vertices";
    constexpr char texture_file[] = "/tmp/"OBJECT".texture";
    constexpr char indices_file[] = "/tmp/"OBJECT".indices";
    constexpr char normals_file[] = "/tmp/"OBJECT".normals";

    FILE *fpv = fopen(vertices_file, "w+t");
    FILE *fpt = fopen(texture_file, "w+t");
    FILE *fpi = fopen(indices_file, "w+t");
    FILE *fpn = fopen(normals_file, "w+t");

    bool vertices = false;
    bool faces = false;
    size_t num_vertices = 0;
    size_t num_faces = 0;
    char buffer[4096]={0};
    FILE* fpin, *fpout;

    if(!fpv) {
        printf("could not open vertices file for writing\n");
        goto Exit;
    }
    if(!fpi) {
        printf("could not open indices file for writing\n");
        goto Exit;
    }
    if(!fpt) {
        printf("could not open texture file for writing\n");
        goto Exit;
    }
    if(!fpn) {
        printf("could not open normals file for writing\n");
        goto Exit;
    }
    fpin = fopen("/home/dev/oosman/Downloads/"OBJECT".ply", "rt");
    if(!fpin) {
        printf("invalid input file\n");
        goto Exit;
    }
    fpout = fopen("/home/dev/oosman/work.web.git/tmp/"OBJECT".js", "wt");
    if(!fpin) {
        printf("invalid output file\n");
        goto Exit;
    }
    printf("opened %s\n", "/home/dev/oosman/Downloads/"OBJECT".ply");
    startObjectDeclaration(fpv, "vertices");
    startObjectDeclaration(fpi, "indices");
    startObjectDeclaration(fpn, "normals");
    startObjectDeclaration(fpt, "texture");

    while(fgets(buffer, sizeof(buffer), fpin)) {
        //printf(buffer);

        if(vertices && num_vertices > 0) {
            float x=0, y=0, z=0, nx=0, ny=0, nz=0, s=0, t=1;
            sscanf(buffer, "%f %f %f %f %f %f %f %f", &x, &y, &z, &nx, &ny, &nz, &s, &t);
            fprintf(fpv, "%f,%f,%f,\n", x,y,z);
            fprintf(fpn, "%f,%f,%f,\n", nx,ny,nz);
            fprintf(fpt, "%f,%f,\n", s,t);
            num_vertices--;
            if(num_vertices == 0) {
                vertices = false;
                faces = true;
            }
        }
        else if(faces && num_faces > 0) {
            int n=0, x=0, y=0, z=0;
            sscanf(buffer, "%i %i %i %i", &n, &x, &y, &z);
            if(n != 3) {
                printf("faces must be triangles!, cannot be %i\n", n);
                break;
            }
            fprintf(fpi,"%i,%i,%i,\n", x, y, z);
            num_faces--;
            if(num_faces == 0) {
                break;
            }
        }
        if(strstr(buffer, "element vertex")) {
            sscanf(buffer, "element vertex %i", &num_vertices);
            printf("num_vertices: %i\n", num_vertices);
        }
        else if(strstr(buffer, "element face")){
            sscanf(buffer, "element face %i", &num_faces);
            if(num_faces > 65535) {
                printf("cannot have more than 65535 indices, you have %i\n", num_faces);
                break;
            }
            printf("num_faces: %i\n", num_faces);
        }
        else if(strstr(buffer, "end_header")){
            vertices = true;
        }
        memset(buffer, 0, sizeof(buffer));
    }
    endObjectDeclaration(fpv);
    endObjectDeclaration(fpi);
    endObjectDeclaration(fpn);
    endObjectDeclaration(fpt);
    combine(fpv, fpi, fpn, fpt, fpout);
    printf("saved %s\n", "/home/dev/oosman/work.web.git/tmp/"OBJECT".js");

Exit:
    if(fpin) {fclose(fpin);}
    if(fpv) {fclose(fpv);}
    if(fpn) {fclose(fpn);}
    if(fpt) {fclose(fpt);}
    if(fpi) {fclose(fpi);}
    if(fpout) {fclose(fpout);}

    remove(vertices_file);
    remove(texture_file);
    remove(indices_file);
    remove(normals_file);

    return 0;
}
